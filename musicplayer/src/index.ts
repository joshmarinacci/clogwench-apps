import {
    ActionButton,
    VBox,
    Label,
    SurfaceContext,
    HBox,
    SelectList,
    HSpacer,
    BaseView, Size, ScrollView, COMMAND_ACTION, COMMAND_CHANGE,
    Rect,
} from "thneed-gfx";
import {make_logger} from "josh_js_util"
import {App, ClogwenchWindowSurface, DBObj} from "thneed-idealos-common";

const log = make_logger("MusicPlayer")

type SongTrack = {
    id:string,
    deleted:boolean,
    data: {
        album:string,
        mimetype:string,
        title:string,
        type:string,
        artist:string,
    }
}
function make_statusbar() {
    let status_bar = new HBox()
    status_bar.set_vflex(false)
    status_bar.set_hflex(true)
    status_bar.add(new Label("cool status bar"))
    return status_bar
}


class LCDView extends BaseView {
    constructor() {
        super("lcd-view");
        this._name = 'lcd-view'
    }
    draw(g: SurfaceContext): void {
        g.fillBackgroundSize(this.size(),'#cccccc')
        let text = 'LCD View'
        let size = g.measureText(text,'base')
        let x = (this.size().w - size.w)/2
        let y = (this.size().h - size.h)/2
        // g.fillRect(x,y,size.w,size.h,'aqua')
        g.fillStandardText(text,x,y+size.h,'base')
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(new Size(200,60))
        return this.size()
    }
}

function make_toolbar(player:MusicPlayer) {
    let hbox = new HBox()
    hbox.set_fill('#00ffff')
    hbox.set_hflex(true)
    hbox.set_vflex(false)
    let prev = new ActionButton()
    prev.set_caption('prev')
    hbox.add(prev)
    let play = new ActionButton()
    play.set_caption('play')
    play.on(COMMAND_ACTION, (e) => {
        let track = player.get_selected_track();
        let playing:boolean = player.is_playing();
        if(playing) {
            play.set_caption("play")
            player.pause_track(track)
        } else {
            play.set_caption("pause")
            player.play_track(track)
        }
    })
    hbox.add(play)
    let next = new ActionButton()
    next.set_caption('next')
    hbox.add(next)

    hbox.add(new HSpacer())
    hbox.add(new LCDView())
    return hbox
}

export class MusicPlayer extends VBox {
    private song_list: SelectList;
    private artist_list: SelectList;
    private album_list: SelectList;
    private _selected_track: DBObj;
    private app: App;
    private playing: boolean;
    private source: string;
    private content_scroll: ScrollView;

    constructor(app: App) {
        super();
        this.app = app;
        this.set_name('MusicPlayer')
        this.add(make_toolbar(this))
        this.playing = false


        let middle_layer = new HBox()
        middle_layer.set_vflex(true)
        middle_layer.set_name('middle')
        let sources = ['Artists','Albums','Songs']
        let source_list = new SelectList(sources,(v)=>v)
        source_list.set_data(sources)
        let source_scroll = new ScrollView()
        source_scroll.set_content(source_list)
        source_scroll.set_pref_width(150)
        source_scroll.set_vflex(true)
        middle_layer.add(source_scroll)

        let test_song = {
            id:"some-bad-id",
            data: {
                album:"foo",
                title:"bar",
                artist:"baz"
            }
        }
        let rend = (obj) => {
            return `${obj.data.title} - ${obj.data.artist}`
        }
        this.song_list = new SelectList([test_song],rend)
        this.song_list.on(COMMAND_CHANGE,(e) => {
            this.set_selected_track(e.item)
        })

        this.artist_list = new SelectList([],(s)=>s);
        this.album_list = new SelectList([],(s)=>s);


        this.content_scroll = new ScrollView();
        this.content_scroll.set_content(new ActionButton())
        this.content_scroll.set_pref_width(250)
        this.content_scroll.set_vflex(true)
        middle_layer.add(this.content_scroll)

        this.add(middle_layer)
        this.add(make_statusbar());


        source_list.on(COMMAND_CHANGE, (e)=>{
            this.set_source(e.item)
        })


        setTimeout(async ()=>{
            // console.log('fetching a database query')
            try {
                let tracks = await app.db_query([{kind:'equals',key:'type', value:'song-track'}])
                this.set_tracks(tracks)
                // surface.repaint()
            } catch (e) {
                console.error(e)
            }
        },500)

    }

    set_source(item: string) {
        this.source = item
        if(this.source === 'Artists') {
            this.app.db_query([{kind:'equals',key:'type', value:'song-track'}])
                .then(tracks => {
                let artists:Set<string> = new Set();
                for(let track of tracks) {
                    artists.add(track.data.artist);
                }
                console.log('artists are',artists);
                this.set_artists(Array.from(artists));
            })
        }
        if(this.source === 'Albums') {
            this.app.db_query([{kind:'equals',key:'type', value:'song-track'}])
                .then((tracks:SongTrack[]) => {
                    let albums:Set<string> = new Set();
                    for(let track of tracks) {
                        albums.add(track.data.album);
                    }
                    console.log('albums are',albums);
                    this.set_albums(Array.from(albums));
                })
        }
        if(this.source === 'Songs') {
            this.app.db_query([{kind:'equals',key:'type', value:'song-track'}]).then(tracks => {
                this.set_tracks(tracks)
            })
        }
    }
    set_tracks(tracks:SongTrack[]) {
        this.song_list.set_data(tracks)
        this.content_scroll.set_content(this.song_list)
    }
    set_artists(artists:string[]) {
        this.artist_list.set_data(artists);
        this.content_scroll.set_content(this.artist_list)
    }
    set_albums(albums:string[]) {
        this.album_list.set_data(albums);
        this.content_scroll.set_content(this.album_list)
    }

    get_selected_track():DBObj {
        return this._selected_track;
    }

    play_track(track: DBObj) {
        log.info("music player playing",track);
        this.playing = true
        this.app.send_and_wait({
            AudioPlayTrackRequest: {
                app_id:this.app.id,
                track:track,
            }
        }).then(r => {
            log.info("got the result",r)
        })
    }

    pause_track(track: DBObj) {
        log.info("music player pausing",track);
        this.playing = false
        this.app.send_and_wait({
            AudioPauseTrackRequest: {
                app_id:this.app.id,
                track:track,
            }
        }).then(r => {
            log.info("got the result",r)
        })
    }

    private set_selected_track(item) {
        this._selected_track = item;
    }

    is_playing() {
        return this.playing
    }
}
function make_music_player(surface: SurfaceContext, app:App):MusicPlayer {
    let root = new MusicPlayer(app)
    root.set_hflex(true)
    root.set_vflex(true)
    return root
}



function start(app: App, surface: ClogwenchWindowSurface) {
    let music_root = make_music_player(surface,app);
    surface.set_root(music_root)
    surface.start_input()
    surface.repaint()
}

async function doit() {
    let app = new App()
    await app.connect()
    await app.send_and_wait({AppConnect: {HelloApp: {}}})
    let win = await app.open_window(new Rect(50, 50, 600, 300))
    let surface = new ClogwenchWindowSurface(win);
    start(app,surface)
    app.on_close_window(() => {
        console.log("window closed. quitting")
        process.exit(0)
    })
}

doit().then(() => console.log("fully started")).catch((e) => console.error(e))
