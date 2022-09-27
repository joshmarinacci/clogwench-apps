import {
    ActionButton,
    Rect, ScrollView,
    View, with_props,
} from "thneed-gfx";
import {App,ClogwenchWindowSurface} from "thneed-idealos-common"
import {BlockStyle, Paragraph, RichTextArea, TextStyle} from "./richtext";

let plain:TextStyle = {
    font: "base",
    underline: false,
    color:'#000000',
    weight:'plain'
}
let link:TextStyle = {
    font:"base",
    underline: true,
    color: '#0000ff',
    weight:'plain',
}
let bold:TextStyle = {
    font: "base",
    underline: false,
    color:'#000000',
    weight:'bold'
}
let block_plain:BlockStyle = {
    background_color: "#ffffff",
    border_width: 0,
    border_color: "#000000",
    padding_width: 5,
}
let block_header:BlockStyle = {
    background_color: '#00ffff',
    border_width: 1,
    border_color: "#444444",
    padding_width: 10
}
let DOC:Paragraph[] = [
    {
        runs:[
            {
                text:"This is some very cool and long text to read that will definitely need to be wrapped.",
                style: plain,
            },
            {
                text:"And this is some more text to read, now in BOLD!",
                style: bold
            },
        ],
        style: block_plain,
    },
    {
        runs:[
            {
                text:"In the second paragraph.", style: plain
            },
            {
                text: "Text can be underlined too.", style: link
            }
        ],
        style: block_plain,
    },
    {
        runs:[
            {
                text:"Third paragraph just has a single run of text in it but has a block header style",
                style: plain
            }
        ],
        style: block_header,
    }
]


function make_main_view(surface:ClogwenchWindowSurface, app:App):View {
    let scroll = new ScrollView();
    scroll.set_hflex(true)
    scroll.set_vflex(true)
    scroll.set_content(with_props(new RichTextArea(), {doc:DOC}))
    return scroll
}

function start(app: App, surface: ClogwenchWindowSurface) {
    let music_root = make_main_view(surface, app);
    surface.set_root(music_root)
    surface.start_input()
    surface.repaint()
}


async function doit() {
    let app = new App()
    await app.connect()
    await app.send_and_wait({AppConnect: {HelloApp: {}}})
    let win = await app.open_window(new Rect(50, 50, 300, 400))
    let surface = new ClogwenchWindowSurface(win);
    start(app,surface)
    app.on_close_window(() => {
        console.log("window closed. quitting")
        process.exit(0)
    })
}

doit().then(() => console.log("fully started")).catch((e) => console.error(e))
