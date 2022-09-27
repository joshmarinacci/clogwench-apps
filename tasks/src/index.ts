import {
    ActionButton,
    BaseParentView, CheckButton,
    COMMAND_ACTION,
    COMMAND_CHANGE, CoolEvent, HBox, HSpacer, KEYBOARD_CATEGORY, KEYBOARD_DOWN, Label, Point,
    POINTER_DOWN, Rect, Size,
    SurfaceContext,
    TextLine, ToggleButton,
    VBox,
    KeyboardEvent,
    View, with_props, calculate_style, Style,
} from "thneed-gfx";
import {App,ClogwenchWindowSurface} from "thneed-idealos-common"

type TodoItem = {
    id:string,
    data: {
        type:"task-item",
        description: string,
        completed: boolean,
        tags: string[],
    }
}
let DATA:TodoItem[] = [
]

class EditableLabel extends BaseParentView {
    private ed_lab_lab: Label;
    private _text: string;
    private ed_lab_line: TextLine;
    private editing: boolean;
    constructor() {
        super("editable-label");
        this._text = "no text"
        this.ed_lab_lab = with_props(new Label(),{caption:this._text}) as Label
        this.add(this.ed_lab_lab)
        this.ed_lab_lab.set_visible(true)
        this.ed_lab_line = with_props(new TextLine(),{text:this._text}) as TextLine
        this.ed_lab_line.set_visible(false)
        this.add(this.ed_lab_line)
        this.set_hflex(true)
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(new Size(available.w,20))
        this.get_children().forEach(ch => ch.layout(g,new Size(available.w,20)))
        return this.size()
    }

    set_editing(b: boolean) {
        this.editing = b
        if(this.editing) {
            this.ed_lab_lab.set_visible(false)
            this.ed_lab_line.set_visible(true)
        } else {
            let t = this.ed_lab_line.text
            this.ed_lab_lab.set_caption(t)
            this.ed_lab_lab.set_visible(true)
            this.ed_lab_line.set_visible(false)
            this._text = t
        }
    }

    text() {
        return this._text
    }

    set_text(desc: string) {
        this._text = desc
        this.ed_lab_lab.set_caption(this._text)
        this.ed_lab_line.set_text(this._text)
    }
}



function make_item_view(td: TodoItem):View {
    let ed_lab = new EditableLabel()
    ed_lab.set_text(td.data.description)
    let box = with_props(new VBox(),{}) as VBox
    let row = with_props(new HBox(), {hflex:true}) as HBox
    let cb = with_props(new CheckButton(), {caption:'c', selected:td.data.completed})
    cb.on(COMMAND_CHANGE,(e)=>td.data.completed = e.target.selected())
    row.add(cb)
    // row.add(with_props(new Label(),{caption:td.desc}))
    row.add(ed_lab)
    box.add(row)
    let row2 = new HBox()
    row2.add(with_props(new Label(), {caption:'tags'}))
    row2.add(new HSpacer())
    box.add(row2)
    let tog = new ToggleButton()
    tog.set_caption("edit")
    tog.on(COMMAND_CHANGE,() => {
        ed_lab.set_editing(tog.selected())
        //if just finished editing, copy back the text
        if(!tog.selected()) {
            td.data.description = ed_lab.text()
        }
    })
    // let ed = with_action(with_props(new ActionButton(),{caption:'edit'}) as ActionButton,()=>{
    //     ed_lab.set_editing(true)
    //     let edit_row = with_props(new HBox(),{fill:'#f0f0f0', hflex:true}) as HBox
    //     edit_row.add(with_props(new Label(),{caption:'editing'}))
    //     edit_row.add(with_action(with_props(new ActionButton(),{caption:'done'}) as ActionButton,()=>{
    //         // td.desc = ed_lab_line.text
    //         // ed_lab_lab.set_caption(td.desc)
    //         // ed_lab_lab.set_visible(true)
    //         // ed_lab_line.set_visible(false)
    //         box.remove(edit_row)
    //     }))
    //     box.add(edit_row)
    // })
    row2.add(tog)
    return box
}

const LIST_ITEM_PAD = 3;
class ListItemView extends BaseParentView {
    private list: CompoundListView;
    constructor(listView: CompoundListView) {
        super("list-item-view");
        this.set_name('list-item-view')
        this.list = listView
    }
    override can_receive_mouse(): boolean {
        return true
    }

    input(event: CoolEvent) {
        if(event.type === POINTER_DOWN) {
            this.list.set_selected_view(this)
        }
    }

    draw(g: SurfaceContext) {
        let style:Style = calculate_style("select-list",this.list.selected_view()===this);
        g.fillBackgroundSize(this.size(), style.background_color)
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout(g,new Size(available.w-LIST_ITEM_PAD*2,available.h))
            ch.set_position(new Point(LIST_ITEM_PAD,LIST_ITEM_PAD))
        })
        let y = 0
        this.get_children().forEach(ch => {
            y = ch.position().y + ch.size().h + LIST_ITEM_PAD
        })
        this.set_size(new Size(available.w,y))
        return this.size()
    }
}

class CompoundListView extends BaseParentView {
    private sel: ListItemView|null;
    constructor() {
        super("compound-list-view");
    }
    input(event: CoolEvent) {
        if(event.category === KEYBOARD_CATEGORY) {
            let e = event as KeyboardEvent
            if(e.type === KEYBOARD_DOWN) {
                if (e.code === 'ArrowDown') {
                    let n = this._children.indexOf(this.sel)
                    if (n >= 0) {
                        if (n < this._children.length - 1) {
                            n = n + 1
                            this.sel = this._children[n] as ListItemView
                        }
                    }
                }
                if(e.code === 'ArrowUp') {
                    let n = this._children.indexOf(this.sel)
                    if (n >= 1) {
                        n = n -1
                        this.sel = this._children[n] as ListItemView
                    }
                }
            }
        }
        if(event.type === POINTER_DOWN) {
            event.ctx.set_keyboard_focus(this)
        }
    }

    override draw(g: SurfaceContext) {
        // g.fillBackgroundSize(this.size(),'#f0f0f0')
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout(g,available)
        })
        let y = 0;
        this.get_children().forEach(ch => {
            ch.set_position(new Point(0,y))
            y += ch.size().h
            // y += 30
        })
        this.set_size(available)
        return this.size()
    }

    add_item(view: View) {
        let item_view = new ListItemView(this);
        item_view.add(view)
        this.add(item_view)
    }
    remove_all_items() {
        this._children = []
        this.sel = null
    }

    set_selected_view(sel: ListItemView) {
        this.sel = sel
    }

    selected_view() {
        return this.sel
    }
}

function make_main_view(surface, app):View {
    let vbox = new VBox()
    vbox.set_vflex(true)
    vbox.set_hflex(true)

    let toolbar = new HBox()
    toolbar.set_hflex(true)
    let add = new ActionButton()
    add.set_caption("add item")
    toolbar.add(add)
    vbox.add(toolbar)

    let list_view = with_props(new CompoundListView(), {name:'main-view', vflex:true, hflex:true}) as CompoundListView
    DATA.forEach(td => list_view.add_item(make_item_view(td)))
    vbox.add(list_view)

    const refresh_list = async () => {
        let results = await app.db_query([{ kind:'equals', key:'type', value:'task-item'}])
        list_view.remove_all_items()
        results.forEach(item => list_view.add_item(make_item_view(item)))
        surface.repaint()
    }

    add.on(COMMAND_ACTION,() => {
        let new_item:TodoItem = {
            id:"",
            data: {
                type:"task-item",
                completed: false,
                description: "no desc",
                tags: ["two", "tags"]
            }
        }
        DATA.push(new_item)
        list_view.add_item(make_item_view(new_item))
    })

    setTimeout(async () => {
        await refresh_list()
    },500)

    return vbox
}

function start(app: App, surface: ClogwenchWindowSurface) {
    let music_root = make_main_view(surface, app);
    surface.set_root(music_root)
    surface.start_input()
    surface.repaint()
}


async function doit() {
    console.log("making an app")
    let app = new App()
    await app.connect()
    await app.send_and_wait({AppConnect: {HelloApp: {}}})
    let win = await app.open_window(new Rect(50, 50, 500, 300))
    let surface = new ClogwenchWindowSurface(win);
    start(app,surface)
    // app.on_close_window(() => {
    //     console.log("window closed. quitting")
    //     process.exit(0)
    // })
}

doit().then(() => console.log("fully started")).catch((e) => console.error(e))
