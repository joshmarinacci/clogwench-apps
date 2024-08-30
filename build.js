import {promises as fs} from "fs"
import path from "path"
import {getFiles,file_readable} from "josh_node_util"
import {make_logger} from "josh_js_util"
import child_process from "child_process"

const log = make_logger("ROOT")
const command = "install"

function execit(dir,cmd) {
    return new Promise((res,rej)=>{
        child_process.exec(cmd,{
            cwd:dir,
        },(e,so,se)=>{
            // log.info("callback",e,so,se)
            if(e) {
                log.info(`error in ${dir}`,e,se)
                rej(e)
            } else {
                res(so)
            }
        })
    })
}

async function do_command(dir, command) {
    log.info(`${dir}:${command}`);
    if(command === "install") {
        let output = await execit(dir,`npm install`)
    }
    if(command === "full-clean") {
        let output = await execit(dir,`rm -rf build dist node_modules .parcel-cache`)
        log.info(output)
    }
    if(command === 'build') {
        let output = await execit(dir,`npm run build`)
        log.info(output)
    }

}

function print_help() {
    console.log("node doall <command>")
    console.log("   available commands")
    console.log("   full-clean")
    console.log("   build")
}


async function doit() {
    if(process.argv.length < 3) return print_help()
    let command = process.argv[2]
    let dirs = await fs.readdir(".")
    dirs = dirs.filter(d => !d.startsWith('.'))
    for(let dir of dirs) {
        if (await file_readable(path.join(dir,'package.json'))) {
            await do_command(dir,command)
        }
    }

}

doit().then(()=>console.log("done")).catch((e)=>console.log("error",e))
