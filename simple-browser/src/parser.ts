import raw_grammar from "./parser.ohm.js"
import ohm from "ohm-js"
import {BlockStyle, Paragraph, TextRun, TextStyle} from "./richtext";

class Loggo {
    private depth: number;
    private tab_char:string
    private prefix: string;
    constructor() {
        this.depth = 0
        this.tab_char = "    "
        this.prefix = ""
    }
    indent() {
        this.depth++
    }
    outdent() {
        this.depth--
    }
    print(...args) {
        let inset = ""
        for(let i=0; i<this.depth; i++) {
            inset += this.tab_char
        }
        console.log(this.prefix,inset,...args)
    }

    set_prefix(s:string) {
        this.prefix = s
    }
    set_tab(s: string) {
        this.tab_char = s
    }

    inspect(obj:any) {
        this.print(JSON.stringify(obj,null,"    "));
    }
}

export function parse_html(input):Paragraph[] {
    const L = new Loggo()

    type Open = {
        type:'open',
        value:string,
        atts:{},
    }
    type Text = {
        type:'text',
        value:string,
    }
    type Close = {
        type:'close'
        value:string,
    }
    type Empty = {
        type:'empty',
        value:string,
    }
    type Token = | Open | Text | Close | Empty

    const pairs_to_map = (pairs:string[][])=>{
        let obj = {}
        pairs.forEach(([k, v]) =>  obj[k] = v)
        return obj
    }

    let grammar = ohm.grammar(raw_grammar)
    let semantics = grammar.createSemantics()
    semantics.addOperation('ast', {
        _terminal() { return this.sourceString },
        _iter:(...children) => children.map(c => c.ast()),
        ident:(a,b) => a.ast() + b.ast().join(""),
        Open:(a,b,atts,c) => ({type:"open",value:b.ast(), atts:atts.ast()}),
        Atts:(a) => pairs_to_map(a.asIteration().children.map(ch => ch.ast())),
        Att:(name,eq,value)=> [name.ast(),value.ast()],
        AttVal_q :(q1,value,q2) => value.ast().join(""),
        AttVal_qq:(q1,value,q2) => value.ast().join(""),
        Close:(a,a1, b,c) => ({type:"close",value:b.ast()}),
        Empty:(a,b,c,d)=>({type:"empty",value:b.ast()}),
        text:(t) => ({type:"text",value:t.ast().join("")}),
    })

    type Element = {
        type:'element',
        name:string,
        atts:{},
        children:Node[]
    }
    type TextNode = {
        type:'text',
        text:string
    }
    type Node = Element | TextNode
    function to_elements(tokens:Token[]):Node {
        let stack:Node[] = []
        let root:Element = {
            type:"element",
            name:"root",
            atts:{},
            children:[]
        }
        stack.push(root)
        for(let tok of tokens) {
            // L.print("token",tok);
            if(tok.type === "open") {
                let elem:Element = {
                    type:"element",
                    name:tok.value,
                    atts:(tok as Open).atts,
                    children:[]
                }
                let last = stack[stack.length-1] as Element
                if(last) last.children.push(elem)
                stack.push(elem)
            }
            if(tok.type === "text") {
                let text:TextNode = {
                    type:"text",
                    text:tok.value,
                }
                let last = stack[stack.length-1] as Element
                last.children.push(text)
            }
            if(tok.type === "close") {
                // let last = stack[stack.length-1] as Element
                stack.pop()
            }
            if(tok.type === 'empty') {
                let elem:Element = {
                    type:"element",
                    name:tok.value,
                    atts:{},
                    children:[]
                }
                let last = stack[stack.length-1] as Element
                if(last) last.children.push(elem)
                stack.push(elem)
            }
        }
        return stack[0]
    }

    L.print("input is",input)
    let res1 = grammar.match(input)
    if (res1.failed()) throw new Error("match failed")
    let tokens:Token[] = semantics(res1).ast()
    L.print("tokens",tokens)
    let root = to_elements(tokens)
    L.inspect(root)

    let plain:TextStyle = {
        font: "base",
        underline: false,
        color:'#000000',
        weight:'plain'
    }
    let block_plain:BlockStyle = {
        background_color: "#ffffff",
        border_width: 1,
        border_color: "#000000",
        padding_width: 5,
    }

    let ch:Element = (root as Element).children[0] as Element
    // console.log('real root',ch)

    const to_TextRun = (txt:TextNode):TextRun => ({ style: plain, text: txt.text })
    return ch.children.map(ch => {
        let p:Paragraph = {
            runs:[],
            style:block_plain,
        }
        switch (ch.type) {
            case "element":
                p.runs = (ch as Element).children.map(text => to_TextRun(text as TextNode))
                break
            case "text":
                p.runs = [to_TextRun(ch as TextNode)]
                break
        }
        return p
    })
}

