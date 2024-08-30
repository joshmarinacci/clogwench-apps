import {
    Rect, ScrollView,
    View, with_props,
} from "thneed-gfx";
import {App,ClogwenchWindowSurface} from "thneed-idealos-common"
import {BlockStyle, Paragraph, RichTextArea, TextStyle} from "./richtext.js";
import {parse_html} from "./parser.js";

// let plain:TextStyle = {
//     font: "base",
//     underline: false,
//     color:'#000000',
//     weight:'plain'
// }
// let link:TextStyle = {
//     font:"base",
//     underline: true,
//     color: '#0000ff',
//     weight:'plain',
// }
// let bold:TextStyle = {
//     font: "base",
//     underline: false,
//     color:'#000000',
//     weight:'bold'
// }
// let block_plain:BlockStyle = {
//     background_color: "#ffffff",
//     border_width: 0,
//     border_color: "#000000",
//     padding_width: 5,
// }
// let block_header:BlockStyle = {
//     background_color: '#00ffff',
//     border_width: 1,
//     border_color: "#444444",
//     padding_width: 10
// }

const SAMPLE_HTML = `<html>
<h1>Welcome My Son</h1>
<p>Welcome to the machine!</p>
</html>`

function make_main_view(surface:ClogwenchWindowSurface, app:App):View {
    let scroll = new ScrollView();
    scroll.set_hflex(true)
    scroll.set_vflex(true)
    let ra = new RichTextArea()
    ra.set_doc(parse_html(SAMPLE_HTML))
    scroll.set_content(ra)
    return scroll
}


function start(app: App, surface: ClogwenchWindowSurface) {
    let app_root = make_main_view(surface, app);
    surface.set_root(app_root)
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
