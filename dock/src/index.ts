import {
    ActionButton, COMMAND_ACTION, LayerView, Rect,
    VBox,
    Label, TextLine,
} from "thneed-gfx";
import * as child_process from "child_process";
import path from "path";
import {App, ClogwenchWindowSurface} from "thneed-idealos-common";


function start(surface: ClogwenchWindowSurface, app:App) {
    let vbox = new VBox()

    let label = new Label()
    label.set_caption('Dock')
    vbox.add(label)

    const refresh_list = async () => {
        let results = await app.db_query(
            [{
                kind:'equals',
                key:'type',
                value:'application-definition',
            }]
        )
        console.log("results is",results)
        results.forEach(info => {
            let button = new ActionButton()
            button.set_caption(info.data.title)
            button.on(COMMAND_ACTION, () => {
                let pth = path.join("..",info.data.path);
                pth = path.normalize(pth);
                console.log(`launching:${info.data.command} in dir ${pth}`)
                child_process.spawn('npm',['run','start'],{
                    cwd:pth,
                    detached:true,
                })
            })
            vbox.add(button)
        })
        surface.repaint()
    }

    refresh_list()


    let quit_button = new ActionButton()
    quit_button.set_caption("quit")
    quit_button.on(COMMAND_ACTION, async () => {
        process.exit(0)
    })
    vbox.add(quit_button)


    let root = new LayerView('root-layer')
    root.add(vbox)
    surface.set_root(root)
    surface.start_input()
    app.on_close_window(() => {
        console.log("window was closed");
        process.exit(0)
    })
}

async function doit() {
    let app = new App()
    await app.connect()
    await app.send_and_wait({AppConnect: {HelloApp: {}}})
    let win = await app.open_window(new Rect(50, 50, 100, 300))
    let surface = new ClogwenchWindowSurface(win);
    start(surface,app)
}

doit().then(() => console.log("fully started")).catch((e) => console.error(e))
