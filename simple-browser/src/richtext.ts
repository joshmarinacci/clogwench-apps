import {
    BaseView,
    CoolEvent, Point,
    POINTER_MOVE,
    PointerEvent, Rect, Size, SurfaceContext
} from "thneed-gfx"
import {make_logger} from "josh_js_util";

export type TextStyle = {
    font: string,
    color:string,
    weight:string,
    underline:boolean
}
export type BlockStyle = {
    background_color: string,
    border_width: number,
    border_color: string,
    padding_width: number,
}

type TextRun = {
    text: string,
    style: TextStyle,
}
export type Paragraph = {
    runs: TextRun[]
    style: BlockStyle,
}


type SpanBox = {
    type: string,
    position: Point,
    text: string,
    style: TextStyle,
}

type LineBox = {
    type: string,
    size: Size,
    position: Point,
    spans: SpanBox[],
}
type BlockBox = {
    type: string,
    size: Size,
    position: Point,
    style: BlockStyle,
    lines: LineBox[],
}
type RootBox = {
    type: string,
    size: Size,
    position: Point,
    style: BlockStyle,
    blocks: BlockBox[],
}
type ItRes = {
    value: any,
    done: boolean,
}

class WhitespaceIterator {
    n: number
    private text: string;
    private done: boolean;

    constructor(text: string) {
        this.n = 0;
        this.text = text;
        this.done = false
    }

    next(): ItRes {
        if (this.done) return {value: null, done: true}
        let chunk = ""
        while (true) {
            let ch = this.text[this.n]
            this.n++
            if (this.n > this.text.length) {
                this.done = true
                return {
                    value: chunk,
                    done: false
                }
            }
            if (ch === ' ') {
                return {
                    value: chunk,
                    done: false
                }
            } else {
                chunk += ch
            }
        }
    }

}

const log = make_logger("richtext")

function make_line_box(txt: string, w: number, h: number, pt: Point, style:TextStyle): LineBox {
    let line: LineBox = {
        type: "line",
        position: pt.clone(),
        size: new Size(w, h),
        spans: [],
    }
    let span: SpanBox = {
        style: style,
        position: new Point(0, h),
        text: txt,
        type: "span",
    }
    line.spans.push(span)
    return line
}

function do_layout(doc: Paragraph[], size: Size, g: SurfaceContext) {
    let root_style:BlockStyle = {
        background_color: '#ffffff',
        border_width: 0,
        border_color: '#000000',
        padding_width: 5,
    }
    let root: RootBox = {
        style: root_style,
        blocks: [],
        position: new Point(root_style.padding_width, root_style.padding_width),
        size: new Size(size.w - root_style.padding_width * 2, size.h - root_style.padding_width * 2),
        type: "root"
    }

    let y = root_style.padding_width
    let x = root_style.padding_width
    doc.forEach(para => {
        let block: BlockBox = {
            style: para.style,
            lines: [],
            position: new Point(x, y),
            size: new Size(root.size.w - para.style.padding_width * 2, 100),
            type: "block",
        }
        let line_height = 20

        let curr_text = ""
        let curr_pos = new Point(para.style.padding_width, para.style.padding_width)
        let curr_w = 0
        let avail_w = block.size.w

        para.runs.forEach((run: TextRun) => {
            let font = (run.style.weight === 'bold')?'bold':'base'
            let chunks = new WhitespaceIterator(run.text)
            let res = chunks.next()
            while (res.done === false) {
                let m = g.measureText(res.value, font)
                if (curr_pos.x + curr_w + m.w < avail_w) {
                    curr_text += ' ' + res.value
                    curr_w += m.w + g.measureText(" ", font).w
                } else {
                    let line = make_line_box(curr_text, curr_w, line_height, curr_pos, run.style)
                    block.lines.push(line)
                    curr_text = res.value
                    curr_w = m.w
                    curr_pos.x = para.style.padding_width
                    curr_pos.y += line_height
                }
                res = chunks.next()
            }
            if (curr_w > 0) {
                block.lines.push(make_line_box(curr_text, curr_w, line_height, curr_pos, run.style))
                curr_text = ""
                curr_pos.x = curr_w
                curr_w = 0
            }
        })
        block.size.h = curr_pos.y + line_height + para.style.padding_width*2
        root.blocks.push(block)
        y = block.position.y + block.size.h + root_style.padding_width
    })
    if(y > root.size.h) {
        root.size.h = y
    }

    return root
}

class JLogger {
    private _indent: number;
    constructor() {
        this._indent = 0
    }
    l(...args) {
        this.log(...args)
    }

    private log(...param: any[]) {
        console.log(this.tab(),...param)
    }

    private tab() {
        let str = ": "
        for(let i=0; i<this._indent; i++) {
            str += " "
        }
        return str
    }
}

const u = new JLogger()

function box_contains(root: any, position: Point) {
    let r = new Rect(root.position.x,root.position.y, root.size.w, root.size.h)
    return r.contains(position)
}

function find_box(root: RootBox, position: Point):any {
    if(box_contains(root,position)) {
        let pos2 = position.subtract(root.position)
        for(let i=0; i<root.blocks.length; i++) {
            let blk = root.blocks[i]
            if(box_contains(blk,pos2)) {
                let pos3 = pos2.subtract(blk.position)
                for(let j=0; j<blk.lines.length; j++) {
                    let line = blk.lines[j]
                    if(box_contains(line,pos3)) {
                        return line
                    }
                }
                return blk
            }
        }
        return root
    }
    return null
}

function do_render(root: RootBox, g: SurfaceContext, selected_box: any) {
    let root_pos = root.position as Point
    let size = root.size as Size
    g.fill(new Rect(root_pos.x,root_pos.y,size.w,size.h), root.style.background_color)

    function stroke_box(g: SurfaceContext, blk:any, color:string, offset:Point) {
        let pos = blk.position as Point
        pos = pos.add(offset)
        let size = blk.size as Size
        g.stroke(new Rect(pos.x,pos.y,size.w,size.h),color)
    }

    root.blocks.forEach(blk => {
        let blk_pos = blk.position as Point
        blk_pos = blk_pos.add(root_pos)
        let size = blk.size as Size
        if(blk.style.border_width > 0) {
            let r = new Rect(blk_pos.x,blk_pos.y,size.w,size.h)
            g.fill(r, blk.style.border_color)
            g.fill(r.shrink(blk.style.border_width*2),blk.style.background_color)
        } else {
            let r = new Rect(blk_pos.x,blk_pos.y,size.w,size.h)
            g.fill(r,blk.style.background_color)
        }
        blk.lines.forEach((ln:LineBox) => {
            let line_pos = ln.position as Point
            line_pos = line_pos.add(blk_pos)
            ln.spans.forEach((spn:SpanBox) => {
                let pos = spn.position
                pos = pos.add(line_pos)
                let font = (spn.style.weight === 'bold')?'bold':'base'
                g.fillStandardText(spn.text, pos.x, pos.y, font)
                if(spn.style.underline) {
                    g.fill(new Rect(pos.x,pos.y,ln.size.w,2), spn.style.color)
                }
            })
            if(ln === selected_box) {
                stroke_box(g,ln, 'red',blk_pos)
            }
        })
        if(blk === selected_box) {
            stroke_box(g,blk, 'red',blk_pos)
        }
    })
}

export class RichTextArea extends BaseView {
    _doc: Paragraph[]
    render_tree_root: any
    private selected_box: any;

    constructor() {
        super("rich-text-area");
        this._doc = []
    }

    doc(): Paragraph[] {
        return this._doc
    }

    set_doc(doc: Paragraph[]) {
        this._doc = doc
    }

    override input(event: CoolEvent) {
        if(event.type === POINTER_MOVE) {
            let e = event as PointerEvent
            this.selected_box = find_box(this.render_tree_root as RootBox, e.position)
            event.ctx.repaint()
        }
    }

    draw(g: SurfaceContext): void {
        g.fillBackgroundSize(this.size(), 'white')
        do_render(this.render_tree_root, g, this.selected_box)
    }

    layout(g: SurfaceContext, available: Size): Size {
        if(this.size().w !== available.w) {
            this.set_size(new Size(available.w, available.h))
            this.render_tree_root = do_layout(this._doc, this.size(), g)
            this.set_size(new Size(this.size().w,this.render_tree_root.size.h))
        }
        return this.size()
    }
}
