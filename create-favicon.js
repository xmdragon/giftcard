const fs = require('fs');
const path = require('path');

// 这是一个非常简单的16x16像素的favicon.ico文件的Base64编码
// 它是一个蓝色的礼品盒图标
const faviconBase64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8AMzMzBzMzMxYzMzMWMzMzFjMzMxYzMzMWMzMzFjMzMxYzMzMWMzMzFjMzMxYzMzMWMzMzFjMzMwf///8AMzMzJjMzM14zMzNeMzMzXjMzM14zMzNeMzMzXjMzM14zMzNeMzMzXjMzM14zMzNeMzMzXjMzMyb///8AMzMzXoiIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/zMzM17///8AMzMzXoiIiP8zMzP/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/iIiI/zMzM17///8AMzMzXoiIiP8zMzP/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/iIiI/zMzM17///8AMzMzXoiIiP8zMzP/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/iIiI/zMzM17///8AMzMzXoiIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/zMzM17///8AMzMzXoiIiP8zMzP/MzMz/zMzM/+IiIj/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/iIiI/zMzM17///8AMzMzXoiIiP8zMzP/MzMz/zMzM/+IiIj/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/iIiI/zMzM17///8AMzMzXoiIiP8zMzP/MzMz/zMzM/+IiIj/MzMz/zMzM/8zMzP/MzMz/zMzM/8zMzP/iIiI/zMzM17///8AMzMzXoiIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/4iIiP+IiIj/iIiI/zMzM17///8AMzMzJjMzM14zMzNeMzMzXjMzM14zMzNeMzMzXjMzM14zMzNeMzMzXjMzM14zMzNeMzMzXjMzMyb///8AMzMzBzMzMxYzMzMWMzMzFjMzMxYzMzMWMzMzFjMzMxYzMzMWMzMzFjMzMxYzMzMWMzMzFjMzMwf///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wA=';

// 将Base64编码的数据解码为二进制数据
const faviconData = Buffer.from(faviconBase64, 'base64');

// 将favicon.ico文件保存到public目录（前端）
const publicFaviconPath = path.join(__dirname, 'public', 'favicon.ico');
fs.writeFileSync(publicFaviconPath, faviconData);
console.log(`Favicon created at: ${publicFaviconPath}`);

// 将favicon.ico文件保存到根目录（后端）
const rootFaviconPath = path.join(__dirname, 'favicon.ico');
fs.writeFileSync(rootFaviconPath, faviconData);
console.log(`Favicon created at: ${rootFaviconPath}`);