import {name, version} from '../../package.json';

//当前 package.json 的版本号
export const VERSION = version;

//  用户的根目录
export const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
// 存储模板的位置,我们将文件下载到当前用户下的 .template 文件中,由于系统的不同目录获取方式不一
// 样, process.platform 在windows下获取的是 win32 我这里是mac 所有获取的值是 darwin ,在根据
// 对应的环境变量获取到用户目录
export const downloadDirectory = `${HOME}/.template`;

// 配置文件目录
export const RC = `${HOME}/.zengrc`;

// RC 配置下载模板的地方，给 github 的 api 使用
// https://api.github.com/users/YvetteLau/repos
// https://api.github.com/${type}/${registry}/repos
// 模板下载地址可配置
export const DEFAULTS = {
    registry: 'YvetteLau',
    type: 'users',
    name,
}