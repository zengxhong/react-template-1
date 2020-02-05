'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _constants = require('./utils/constants');

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// 配置指令命令,根据我们想要实现的功能配置执行动作，遍历产生对应的命令
let actionMap = {
    // 创建模板
    create: {
        alias: 'c',
        description: 'create a new project from a template',
        usages: ['zeng-cli create projectName']
    },
    // 配置配置文件
    config: {
        alias: 'cfg',
        description: 'config .zengrc',
        usages: ['zeng-cli config set <k> <v>', 'zeng-cli config get <k>', 'zeng-cli config remove <k>']
    },
    //other commands
    '*': {
        description: 'command not found',
        usages: []
    }
    // 循环创建命令
};Object.keys(actionMap).forEach(action => {
    // 命令名称
    _commander2.default.command(action)
    // 命令描述
    .description(actionMap[action].description)
    // 命令别名
    .alias(actionMap[action].alias)
    // 命令动作,根据不同的动作，动态引入对应模块的文件 将参数传入,如果动作没匹配到说明输入有误
    .action(() => {
        switch (action) {
            case 'config':
                //配置
                // apply(action, ...process.argv.slice(3));
                require(_path2.default.resolve(__dirname, action))(...process.argv.slice(3));
                break;
            case 'create':
                /**
                 * create命令的主要作用就是去git仓库中拉取模板并下载对应的版本到本地，
                 * 如果有模板则根据用户填写的信息渲染好模板，
                 * 生成到当前运行命令的目录下~
                 */
                require(_path2.default.resolve(__dirname, action))(...process.argv.slice(3));
                // apply(action, ...process.argv.slice(3));
                break;
            default:
                // 如果动作没匹配到说明输入有误
                console.log(actionMap[action].description);
                break;
        }
    });
});
// help命令函数
function help() {
    console.log('\r\nUsage:');
    Object.keys(actionMap).forEach(action => {
        (actionMap[action].usages || []).forEach(usage => {
            console.log(`  - ${usage}`);
        });
    });
    console.log('\r');
}

//  解析用户传递过来的参数
_commander2.default.usage('<command> [options]');
_commander2.default.on('-h', help);
_commander2.default.on('--help', help);
_commander2.default.version(_constants.VERSION, '-V --version').parse(process.argv);

// zeng-cli 不带参数时
if (!process.argv.slice(2).length) {
    _commander2.default.outputHelp(make_green);
}
function make_green(txt) {
    return _chalk2.default.green(txt);
}