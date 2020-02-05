'use strict';

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _ora = require('ora');

var _ora2 = _interopRequireDefault(_ora);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _util = require('util');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _consolidate = require('consolidate');

var _consolidate2 = _interopRequireDefault(_consolidate);

var _metalsmith = require('metalsmith');

var _metalsmith2 = _interopRequireDefault(_metalsmith);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// 下载项目模板

// consolidate 统一了  所有的模板引擎

// 交互
//  拉取项目,需要获取仓库中的所有模板信息，模板全部放在了git上，通过axios去获取相关的信息
let downloadGitRepo = require('download-git-repo');
// 遍历文件夹 找需不需要渲染

// 将异步的api转换成promise

// ora包用于显示加载中的效果，类似于前端页面的loading效果


let { render } = require('consolidate').ejs;
render = (0, _util.promisify)(render);
downloadGitRepo = (0, _util.promisify)(downloadGitRepo);
// ncp 可以实现文件的拷贝功能 （
let ncp = require('ncp');
const { downloadDirectory } = require('./utils/constants');

ncp = (0, _util.promisify)(ncp);
// create 的所有的逻辑
// create功能是创建项目
// 拉取你自己的所有项目列出来 让用户选 安装哪个项目 projectName
// 选完后 在显示所有的版本号 1.0
// https://api.github.com/orgs/zhu-cli/repos 获取组织下的仓库
// 可能还需要用户配置一些数据 来结合渲染我的项目

// 1).获取仓库列表
const fetchRepoList = async () => {
    const { data } = await _axios2.default.get('https://api.github.com/orgs/zhu-cli/repos');
    return data;
};
// 抓取tag列表
const fechTagList = async repo => {
    const { data } = await _axios2.default.get(`https://api.github.com/repos/zhu-cli/${repo}/tags`);
    return data;
};
// 封装loading效果
const waitFnloading = (fn, message) => async (...args) => {
    // 获取到信息之前显示loading
    const spinner = (0, _ora2.default)(message);
    spinner.start();
    const result = await fn(...args);
    // 获取到信息后，关闭loading
    spinner.succeed();
    return result;
};
/**
 * 下载模板
 * @param {*} template 
 * @param {*} version 
 */
const download = async (template, version) => {
    let api = `zhu-cli/${template}`;
    if (version) {
        api += `#${version}`;
    }
    console.log("$$$$$--api---", api);
    // 将模板下载到对应的目录中dest
    const dest = `${downloadDirectory}/${template}`;
    console.log("$$$$$-----", dest);
    await downloadGitRepo(api, dest);
    // 返回下载目录
    return dest; // 下载的最终目录
};
module.exports = async projectName => {
    // 1) 获取项目的模板 （所有的）
    let templates = await waitFnloading(fetchRepoList, 'fetching template ....')();
    templates = templates.map(item => item.name);
    // 交互：选择模板 inquirer
    const { template } = await _inquirer2.default.prompt({
        name: 'template', // 获取选择后的结果
        type: 'list',
        message: 'please choise a template to create project',
        choices: templates
    });
    // 2) 通过当前选择的项目 拉取对应的版本
    // 获取对应的版本号https://api.github.com/repos/zhu-cli/vue-simple-template/tags
    let versions = await waitFnloading(fechTagList, 'fetching versions ....')(template);
    versions = versions.map(item => item.name);

    const { version } = await _inquirer2.default.prompt({
        name: 'version', // 获取选择后的结果
        type: 'list',
        message: 'please choise version to create project',
        choices: versions
    });
    // 下载模板，把模板放到一个临时目录里 存好，以备后期使用
    const target = await waitFnloading(download, 'download template')(template, version);
    // 拿到了下载的目录 直接拷贝当前执行的目录下即可  ncp

    // 复杂的需要模板渲染 渲染后在拷贝
    // 把template 下的文件 拷贝到执行命令的目录下
    // 4) 拷贝操作
    // 这个目录 项目名字是否已经存在 如果存在提示当前已经存在

    // 如果有ask.js 文件 // .template/xxx
    if (!_fs2.default.existsSync(_path2.default.join(target, 'ask.js'))) {
        console.log("******************");
        // 将下载的文件拷贝到当前执行命令的目录下
        await ncp(target, _path2.default.resolve(projectName));
    } else {
        // 如果有ask 文件就是一个复杂的模板,把git上的项目下载下来我们需要用户选择，选择后编译模板
        await new Promise((resolve, reject) => {
            (0, _metalsmith2.default)(__dirname) // 如果你传入路径 他默认会遍历当前路径下的src文件夹
            .source(target).destination(_path2.default.resolve(projectName)).use(async (files, metal, done) => {
                const args = require(_path2.default.join(target, 'ask.js'));
                const obj = await _inquirer2.default.prompt(args);
                const meta = metal.metadata();
                Object.assign(meta, obj);
                delete files['ask.js'];
                done();
            }).use((files, metal, done) => {
                const obj = metal.metadata();
                Reflect.ownKeys(files).forEach(async file => {
                    // 这个是要处理的  <%
                    if (file.includes('js') || file.includes('json')) {
                        let content = files[file].contents.toString(); // 文件的内容
                        if (content.includes('<%')) {
                            content = await render(content, obj);
                            files[file].contents = Buffer.from(content); // 渲染
                        }
                    }
                });
                // 根据用户的输入 下载模板
                done();
            }).build(err => {
                if (err) {
                    reject();
                } else {
                    resolve();
                }
            });
        });
    }
};