import {
    ActionButton,
    VBox,
    Label,
    SurfaceContext,
    HBox,
    SelectList,
    HSpacer,
    BaseView, Size, ScrollView, COMMAND_ACTION, COMMAND_CHANGE,
    Rect, FillChildPanel, Point,
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


const DUMMY_TRACK:SongTrack = {
    data: {
        album: "nowhere",
        artist: "nobody",
        mimetype: "",
        title: "---",
        type: "song-track"},
    deleted: false,
    id: "nothing"

}
class LCDView extends BaseView {
    private track: SongTrack;
    constructor() {
        super("lcd-view");
        this._name = 'lcd-view'
        this.track = DUMMY_TRACK;
    }
    draw(g: SurfaceContext): void {
        g.fillBackgroundSize(this.size(),'#cccccc')
        const center = (text) => {
            let size = g.measureText(text,'base')
            let x = (this.size().w - size.w)/2
            let y = (this.size().h - size.h)/2
            return new Point(x,y)
        }
        const draw_centered= (text,yoff) => {
            let pt = center(text)
            g.fillText(text, pt.add(new Point(0,yoff)),'black')
        }
        draw_centered(this.track.data.title,-2)
        draw_centered(this.track.data.artist,15)
        draw_centered(this.track.data.album,30)

        let text = "paused"
        g.fillText(text, new Point(10,20),'black')
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(new Size(200,60))
        return this.size()
    }

    set_current_track(track: SongTrack) {
        console.log('set track to',track);
        this.track = track;
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
    let lcd = new LCDView()
    player.on("selected-track",(track:SongTrack) => {
        lcd.set_current_track(track)
    })
    hbox.add(lcd)
    return hbox
}

export class MusicPlayer extends VBox {
    private _selected_track: DBObj;
    private app: App;
    private playing: boolean;
    private source: string;
    private query_view: FillChildPanel;

    constructor(app: App) {
        super();
        this.app = app;
        this.set_name('MusicPlayer')
        this.add(make_toolbar(this))
        this.playing = false


        let middle_layer = new HBox()
        middle_layer.set_vflex(true)
        middle_layer.set_fill("#00ff00")
        middle_layer.set_name('middle')
        let sources = ['Artists','Albums','Songs']
        let source_list = new SelectList(sources,(v)=>v)
        source_list.set_data(sources)
        let source_scroll = new ScrollView()
        source_scroll.set_content(source_list)
        source_scroll.set_pref_width(150)
        source_scroll.set_vflex(true)
        middle_layer.add(source_scroll)

        // this.song_list.on(COMMAND_CHANGE,(e) => {
        //     this.set_selected_track(e.item)
        // })

        this.query_view = new FillChildPanel()
        this.query_view.set_hflex(true)
        this.query_view.set_vflex(true)
        let hb = new HBox()
        hb.set_fill('#ff0000')
        hb.set_vflex(true)
        hb.set_hflex(true)
        hb.add(new ActionButton())
        this.query_view.set_child(hb)
        middle_layer.add(this.query_view)

        this.add(middle_layer)
        this.add(make_statusbar());
        source_list.on(COMMAND_CHANGE, (e)=> this.set_source(e.item))
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
        let songs_list = new SelectList(tracks,(obj)=>`${obj.data.title} - ${obj.data.artist}`);
        let songs_scroll = new ScrollView()
        songs_scroll.set_content(songs_list)
        songs_scroll.set_vflex(true)
        songs_scroll.set_hflex(true)
        songs_list.on(COMMAND_CHANGE,e => {
            this.set_selected_track(e.item)
        })
        this.query_view.set_child(songs_scroll)
    }
    set_artists(artists:string[]) {
        let hbox = new HBox()
        hbox.set_vflex(true)

        let artists_list = new SelectList(artists,(a)=>a);
        let artists_scroll = new ScrollView()
        artists_scroll.set_pref_width(150)
        artists_scroll.set_content(artists_list)
        artists_scroll.set_vflex(true)
        hbox.add(artists_scroll)

        let songs_list = new SelectList([],(obj)=>obj.data.title)
        let songs_scroll = new ScrollView()
        songs_scroll.set_pref_width(150)
        songs_scroll.set_content(songs_list)
        songs_scroll.set_vflex(true)
        songs_scroll.set_hflex(true)
        hbox.add(songs_scroll)

        artists_list.on(COMMAND_CHANGE,(e)=>{
            log.info("selected artist",e)
            this.app.db_query([
                {kind:'equals',key:'type', value:'song-track'},
                {kind:'equals',key:'artist',value:e.item}
            ]).then(res => {
                log.info("got back results for artist",res)
                songs_list.set_data(res)
            })

        })
        songs_list.on(COMMAND_CHANGE,e => {
            this.set_selected_track(e.item)
        })

        this.query_view.set_child(hbox)
    }
    set_albums(albums:string[]) {
        let hbox = new HBox()
        hbox.set_vflex(true)
        let albums_list = new SelectList(albums,(a)=>a);
        let albums_scroll = new ScrollView()
        albums_scroll.set_pref_width(150)
        albums_scroll.set_content(albums_list)
        albums_scroll.set_vflex(true)
        hbox.add(albums_scroll)

        let songs_list = new SelectList([],(obj)=>obj.data.title)
        let songs_scroll = new ScrollView()
        songs_scroll.set_pref_width(150)
        songs_scroll.set_content(songs_list)
        songs_scroll.set_vflex(true)
        songs_scroll.set_hflex(true)
        hbox.add(songs_scroll)

        albums_list.on(COMMAND_CHANGE, e => {
            this.app.db_query([
                {kind:'equals',key:'type', value:'song-track'},
                {kind:'equals',key:'album',value:e.item}
            ]).then(res => {
                log.info("got back results for album",res)
                songs_list.set_data(res)
            })
        })
        songs_list.on(COMMAND_CHANGE,e => {
            this.set_selected_track(e.item)
        })
        this.query_view.set_child(hbox)
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
        this.fire("selected-track",this._selected_track)
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
    let win = await app.open_window(new Rect(50, 50, 500, 250))
    let surface = new ClogwenchWindowSurface(win);
    start(app,surface)
    app.on_close_window(() => {
        console.log("window closed. quitting")
        process.exit(0)
    })
}

doit().then(() => console.log("fully started")).catch((e) => console.error(e))
