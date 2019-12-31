const {Command, flags} = require('@oclif/command')
const fs = require('fs')
const glob = require('glob')
const async = require('async')

const CONCURRECY = 50

class SplitdataCommand extends Command {
  async run() {
    const {flags} = this.parse(SplitdataCommand)

    // take folder pairs
    const {argv} = this.parse(SplitdataCommand)
    if (argv.length % 2 !== 0) {
      this.log('folder need to be in pair, for exmaple train 0.8 test 0.2')
      return
    }
    const paris = {}
    for (let i = 0; i < argv.length; i += 2) {
      paris[argv[i]] = Number(argv[i + 1])
    }
    const sum = Object.values(paris).reduce((acc, cur) => acc + cur, 0)
    if (sum !== 1) {
      this.log('sum of percentage need to be 1')
    }

    const files = await this.readDir(flags.input, flags.recursive)

    // get the actual files list need to be move
    const totalLength = files.length
    let remainingCount = files.length
    const fileList = Object.keys(paris).reduce((acc, key) => {
      const count = Math.round(totalLength * paris[key])
      if (remainingCount - count < 0) {
        acc[key] = files.slice(0, remainingCount)
        files.splice(0, remainingCount)
        remainingCount = 0
      } else {
        acc[key] = files.slice(0, count)
        files.splice(0, count)
        remainingCount -= count
      }
      return acc
    }, {})

    // process on file list
    await Object.keys(fileList).reduce((p, next) => p.then(async () => {
      const files = fileList[next]
      const folder = `${process.cwd()}/${next}`
      this.log(`moving ${folder}`)
      fs.mkdirSync(folder)
      await async.eachLimit(files, CONCURRECY, async file => {
        await new Promise(resolve => {
          fs.rename(file, `${folder}/${file.split('/').pop()}`, resolve)
        })
      })
    }), Promise.resolve())
  }

  async readDir(dir, recursive = false) {
    const pattern = recursive ? '**/*.+(jpg|png)' : '*.+(jpg|png)'
    const path = fs.lstatSync(dir).isDirectory() ? dir : `${process.cwd()}/${dir}`
    return new Promise((resolve, reject) => {
      glob(pattern, {
        cwd: path,
        absolute: true,
      }, (err, files) => {
        if (err) {
          this.log(err)
          reject(err)
          return
        }
        resolve(files)
      })
    })
  }
}

SplitdataCommand.strict = false

SplitdataCommand.description = `Describe the command here
...
Able to split data to different folder with customized percentage
`

SplitdataCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),
  input: flags.string({char: 'i', description: 'input folder'}),
  recursive: flags.boolean({char: 'r', description: 'process recursively'}),
  sample: flags.string({char: 's', description: 'sample size to take out from dataset'}),
}

module.exports = SplitdataCommand
