var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { App, ClogwenchWindowSurface } from "thneed-idealos-common";
import { BaseView, POINTER_DOWN, Size, LayerView, Rect, Point, } from "thneed-gfx";
import { make_logger } from "josh_js_util";
let log = make_logger("minesweeper");
class GridModel {
    constructor(size) {
        this.w = size.w;
        this.h = size.h;
        this.data = [];
        for (let i = 0; i < this.w * this.h; i++) {
            this.data[i] = 0;
        }
    }
    get_xy(x, y) {
        let n = this.xy_to_n(x, y);
        return this.data[n];
    }
    set_xy(x, y, value) {
        let n = this.xy_to_n(x, y);
        this.data[n] = value;
    }
    fill_all(cb) {
        this.data = this.data.map((v) => cb(v));
    }
    fill_row(row, cb) {
        for (let i = 0; i < this.h; i++) {
            this.set_xy(i, row, cb(this.get_xy(i, row)));
        }
    }
    fill_col(col, cb) {
        for (let v = 0; v < this.h; v++) {
            this.set_xy(col, v, cb(this.get_xy(col, v)));
        }
    }
    xy_to_n(x, y) {
        return x + y * this.h;
    }
    forEach(cb) {
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                cb(this.get_xy(i, j), i, j);
            }
        }
    }
    dump() {
        log.info("grid model", this.w, this.h);
        log.info(this.data);
    }
    get_at(pt) {
        return this.get_xy(pt.x, pt.y);
    }
    set_at(pt, value) {
        return this.set_xy(pt.x, pt.y, value);
    }
}
/*

20x20 model
place random mines
set the view of each to covered

the view draws each cell using different colors for each.

covered
flagged
uncovered empty
uncovered mine
uncovered with number of adjacent

if all mines are flagged and all other cells are uncovered then you win and next level
if mine uncovered then you lose


 */
class Cell {
    constructor() {
        this.covered = true;
        this.mine = false;
        this.adjacent = 0;
    }
}
class MinesweeperModel {
    constructor() {
        this.grid = new GridModel(new Size(10, 10));
        this.grid.fill_all(() => {
            return new Cell();
        });
    }
    reset(number) {
        this.grid.fill_all(() => {
            return new Cell();
        });
        for (let i = 0; i < number; i++) {
            let n = Math.floor(Math.random() * this.grid.w * this.grid.h);
            let x = n % this.grid.w;
            let y = Math.floor(n / this.grid.w);
            let cell = this.grid.get_xy(x, y);
            cell.mine = true;
            console.log("set mine at ", n, x, y);
        }
        this.grid.forEach((w, x, y) => {
            w.adjacent = this.count_adjacent_mines(x, y);
        });
    }
    count_adjacent_mines(x, y) {
        let count = 0;
        let jstart = y - 1;
        if (jstart < 0)
            jstart = 0;
        let jend = y + 1;
        if (jend >= this.grid.h)
            jend = y;
        let istart = x - 1;
        if (istart < 0)
            istart = 0;
        let iend = x + 1;
        if (iend >= this.grid.w)
            iend = y;
        for (let j = jstart; j <= jend; j++) {
            for (let i = istart; i <= iend; i++) {
                let cell = this.grid.get_xy(i, j);
                if (cell.mine) {
                    count += 1;
                }
            }
        }
        return count;
    }
}
const black = '#000000';
const white = '#ffffff';
class MinesweeperView extends BaseView {
    constructor(model) {
        super('minesweepr-view');
        this.model = model;
        this.scale = 16;
        this.set_size(new Size(this.model.grid.w * this.scale, this.model.grid.h * this.scale));
    }
    draw(g) {
        g.fillBackgroundSize(this.size(), '#000000');
        this.model.grid.forEach((v, x, y) => {
            let r = new Rect(x * this.scale, y * this.scale, this.scale - 1, this.scale - 1);
            let color = '#cccccc';
            if (v.mine)
                color = '#000000';
            if (v.covered)
                color = '#ff0000';
            g.fill(r, color);
            if (!v.covered) {
                let pos = new Point(x * this.scale + 6, y * this.scale + 16 + 8);
                g.fillText(`${v.adjacent}`, pos, white, 'base');
            }
        });
        g.strokeBackgroundSize(this.size(), '#000000');
    }
    input(evt) {
        if (evt.type === POINTER_DOWN) {
            let e = evt;
            let pt = e.position.divide_floor(this.scale);
            let cell = this.model.grid.get_at(pt);
            // console.log('cell is',cell);
            if (cell.covered === true) {
                cell.covered = false;
                // e.ctx.repaint()
            }
        }
    }
    layout(g, available) {
        return this.size();
    }
}
export function start(surface, app) {
    let model = new MinesweeperModel();
    model.reset(5);
    let view = new MinesweeperView(model);
    let root = new LayerView('root-layer');
    root.add(view);
    surface.set_root(root);
    surface.start_input();
}
function doit() {
    return __awaiter(this, void 0, void 0, function* () {
        let app = new App();
        yield app.connect();
        yield app.send_and_wait({ AppConnect: { HelloApp: {} } });
        let win = yield app.open_window(new Rect(200, 50, 250, 250));
        let surface = new ClogwenchWindowSurface(win);
        start(surface, app);
    });
}
doit().then(() => console.log("fully started")).catch((e) => console.error(e));
