//  拉取项目,需要获取仓库中的所有模板信息，模板全部放在了git上，通过axios去获取相关的信息
import axios from 'axios';
// ora包用于显示加载中的效果，类似于前端页面的loading效果
import ora from 'ora';
// 交互
import Inquirer from 'inquirer';
// 将异步的api转换成promise
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
// consolidate 统一了  所有的模板引擎
import consolidate from 'consolidate';
// 遍历文件夹 找需不需要渲染
import MetalSmith from 'metalsmith'; 
// 下载项目模板
let downloadGitRepo = require('download-git-repo');

let { render } = require('consolidate').ejs;
render = promisify(render);
downloadGitRepo = promisify(downloadGitRepo);
// ncp 可以实现文件的拷贝功能 （
let ncp = require('ncp');
const { downloadDirectory } = require('./utils/constants');

ncp = promisify(ncp);
// create 的所有的逻辑
// create功能是创建项目
// 拉取你自己的所有项目列出来 让用户选 安装哪个项目 projectName
// 选完后 在显示所有的版本号 1.0
// https://api.github.com/orgs/zhu-cli/repos 获取组织下的仓库
// 可能还需要用户配置一些数据 来结合渲染我的项目

// 1).获取仓库列表
const fetchRepoList = async () => {
    const { data } = await axios.get('https://api.github.com/orgs/zhu-cli/repos');
    return data;
};
// 抓取tag列表
const fechTagList = async (repo) => {
    const { data } = await axios.get(`https://api.github.com/repos/zhu-cli/${repo}/tags`);
    return data;
};
// 封装loading效果
const waitFnloading = (fn, message) => async (...args) => {
    // 获取到信息之前显示loading
    const spinner = ora(message);
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
    console.log("$$$$$--api---", api)
    // 将模板下载到对应的目录中dest
    const dest = `${downloadDirectory}/${template}`;
    console.log("$$$$$-----", dest)
    await downloadGitRepo(api, dest);
    // 返回下载目录
    return dest; // 下载的最终目录
};
module.exports = async (projectName) => {
    // 1) 获取项目的模板 （所有的）
    let templates = await waitFnloading(fetchRepoList, 'fetching template ....')();
    templates = templates.map((item) => item.name);
    // 交互：选择模板 inquirer
    const { template } = await Inquirer.prompt({
        name: 'template', // 获取选择后的结果
        type: 'list',
        message: 'please choise a template to create project',
        choices: templates,
    });
    // 2) 通过当前选择的项目 拉取对应的版本
    // 获取对应的版本号https://api.github.com/repos/zhu-cli/vue-simple-template/tags
    let versions = await waitFnloading(fechTagList, 'fetching versions ....')(template);
    versions = versions.map((item) => item.name);

    const { version } = await Inquirer.prompt({
        name: 'version', // 获取选择后的结果
        type: 'list',
        message: 'please choise version to create project',
        choices: versions,
    });
    // 下载模板，把模板放到一个临时目录里 存好，以备后期使用
    const target = await waitFnloading(download, 'download template')(template, version);
    // 拿到了下载的目录 直接拷贝当前执行的目录下即可  ncp

    // 复杂的需要模板渲染 渲染后在拷贝
    // 把template 下的文件 拷贝到执行命令的目录下
    // 4) 拷贝操作
    // 这个目录 项目名字是否已经存在 如果存在提示当前已经存在

    // 没有ask文件说明不需要编译
    if (!fs.existsSync(path.join(target, 'ask.js'))) {
        // 将下载的文件拷贝到当前执行命令的目录下
        await ncp(target, path.resolve(projectName));
    } else {
        // 如果有ask 文件就是一个复杂的模板,把git上的项目下载下来我们需要用户选择，选择后编译模板
        await new Promise((resolve, reject) => {
            MetalSmith(__dirname) // 如果你传入路径 他默认会遍历当前路径下的src文件夹
                .source(target)  // 遍历下载的目录
                .destination(path.resolve(projectName)) // 输出渲染后的结果
                .use(async (files, metal, done) => {
                    const args = require(path.join(target, 'ask.js'));
                    // 弹框询问用户
                    const obj = await Inquirer.prompt(args);
                    const meta = metal.metadata();
                    Object.assign(meta, obj);// 将询问的结果放到metadata中保证在下一个中间件中可以获取到
                    delete files['ask.js'];
                    done();
                })
                .use((files, metal, done) => {
                    const obj = metal.metadata();
                    Reflect.ownKeys(files).forEach(async (file) => {
                        if (file.includes('js') || file.includes('json')) {// 如果是js或者json才有可能是模板
                            let content = files[file].contents.toString();// 获取文件中的内容
                            if (content.includes('<%')) {// 文件中用<% 我才需要编译
                                content = await render(content, obj);// 用数据渲染模板
                                files[file].contents = Buffer.from(content);// 渲染好的结果替换即可
                            }
                        }
                    });
                    // 根据用户的输入 下载模板
                    done();
                })
                .build((err) => {// 执行中间件
                    if (err) {
                        reject();
                    } else {
                        resolve();
                    }
                });
        });
    }
}