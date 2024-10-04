// 在文件开头添加以下代码
const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// 根据环境设置样式
if (isExtension) {
    document.body.classList.add('extension-mode');
}

// 检查 marked 库是否已加载
if (typeof marked === 'undefined') {
    console.error('marked 库未加载，请确保 marked.min.js 文件存在于正确的位置');
    alert('加载 Markdown 解析库失败，请确保 marked.min.js 文件存在于正确的位置');
} else {
    console.log('marked 库已成功加载');
}

// 定义常量
const CANVAS_WIDTH = 1242;
const CANVAS_HEIGHT = 1660;
const MARGIN_PERCENT = 0.1;
const FONT_SIZE = 48;
const LINE_HEIGHT = 1.5;

// 获取DOM元素
const articleContent = document.getElementById('articleContent');
const generateBtn = document.getElementById('generateBtn');
const imageContainer = document.getElementById('imageContainer');
const firstParagraphAsTitle = document.getElementById('firstParagraphAsTitle');
const previewTitle = document.getElementById('previewTitle');
const downloadAllButton = document.getElementById('downloadAllButton');

// 全局变量来存储生成的图片数据
let generatedImages = [];

// 添加事件监听器
document.addEventListener('DOMContentLoaded', () => {
    generateBtn.addEventListener('click', generateImages);
    downloadAllButton.addEventListener('click', downloadAllImages);
});

// 生成图片的主函数
function generateImages() {
    const content = articleContent.value;
    const useFirstParagraphAsTitle = firstParagraphAsTitle.checked;
    imageContainer.innerHTML = '';
    generatedImages = [];

    if (content.trim() === '') {
        alert('请输入文章内容');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    renderContent(ctx, content, canvas, useFirstParagraphAsTitle);

    downloadAllButton.textContent = `一键下载 ${generatedImages.length} 张图片`;
    downloadAllButton.style.display = 'block';
    previewTitle.style.display = 'block';
}

// 渲染内容到Canvas
function renderContent(ctx, content, canvas, useFirstParagraphAsTitle) {
    const availableWidth = CANVAS_WIDTH * (1 - 2 * MARGIN_PERCENT);
    const startX = CANVAS_WIDTH * MARGIN_PERCENT;
    let currentY = CANVAS_HEIGHT * MARGIN_PERCENT;
    let imageIndex = 1;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const paragraphs = content.split('\n');

    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        
        if (paragraph === '') {
            currentY += FONT_SIZE; // 减小空行的间距
            continue;
        }
        
        const isTitle = i === 0 && useFirstParagraphAsTitle;
        const fontSize = isTitle ? FONT_SIZE * 2 : FONT_SIZE;
        
        currentY = renderParagraph(ctx, paragraph, startX, currentY, fontSize, isTitle, availableWidth, canvas, imageIndex);
        
        if (currentY > CANVAS_HEIGHT * (1 - MARGIN_PERCENT)) {
            saveCanvasAsImage(canvas, imageIndex);
            imageIndex++;
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            currentY = CANVAS_HEIGHT * MARGIN_PERCENT;
        }
        
        // 移除这行，因为我们已经在 renderParagraph 中处理了段落间距
        // currentY += fontSize * 0.5;
    }

    if (currentY > CANVAS_HEIGHT * MARGIN_PERCENT) {
        saveCanvasAsImage(canvas, imageIndex);
    }
}

// 修改 renderParagraph 函数
function renderParagraph(ctx, paragraph, x, y, fontSize, isTitle, availableWidth, canvas, imageIndex) {
    ctx.font = `${isTitle ? 'bold' : 'normal'} ${fontSize}px "Noto Sans", Arial, sans-serif`;
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    // 处理中英文、中文数字之间的空格
    paragraph = addSpaceBetweenChineseAndOthers(paragraph);

    const words = paragraph.split('');
    let line = '';
    let lineWidth = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = ctx.measureText(word).width;

        if (lineWidth + wordWidth <= availableWidth) {
            line += word;
            lineWidth += wordWidth;
        } else {
            // 如果当前字符是标点符号，尝试将其添加到当前行
            if (isPunctuationMark(word) && i > 0) {
                const prevChar = words[i - 1];
                if (!isPunctuationMark(prevChar)) {
                    line += word;
                    ctx.fillText(line, x, y);
                    y += fontSize * LINE_HEIGHT;
                    line = '';
                    lineWidth = 0;
                    continue;
                }
            }

            // 渲染当前行并开始新的一行
            ctx.fillText(line, x, y);
            y += fontSize * LINE_HEIGHT;
            line = word;
            lineWidth = wordWidth;
        }

        // 检查是否需要创建新的图片
        if (y > CANVAS_HEIGHT * (1 - MARGIN_PERCENT)) {
            saveCanvasAsImage(canvas, imageIndex);
            imageIndex++;
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            y = CANVAS_HEIGHT * MARGIN_PERCENT;
            ctx.font = `${isTitle ? 'bold' : 'normal'} ${fontSize}px "Noto Sans", Arial, sans-serif`;
            ctx.fillStyle = 'black';
            ctx.textBaseline = 'top';
        }
    }

    // 渲染最后一行
    if (line !== '') {
        ctx.fillText(line, x, y);
        y += fontSize * LINE_HEIGHT;
    }

    return y + (isTitle ? fontSize * 0.5 : fontSize * 0.2);
}

// 添加这个新函数来处理特殊字符
function processSpecialChar(char) {
    // 处理特殊字符，如果需要的话
    if (char === 'A' || char === 'Ａ') {
        return 'A'; // 确保使用标准的 ASCII 'A'
    }
    // 可以添加更多特殊字符的处理
    return char;
}

// 添加这个新函数来检查标点符号
function isPunctuationMark(char) {
    const punctuationMarks = '，。！？；：、）》」』】,.!?;:)>\'"`]}（《「『【[{';
    return punctuationMarks.includes(char);
}

// 添加这个新函数来处理中英文、中文数字之间的空格
function addSpaceBetweenChineseAndOthers(text) {
    // 匹配中文字符
    const chineseRegex = /[\u4e00-\u9fa5]/;
    // 匹配英文字母和数字
    const alphaNumericRegex = /[a-zA-Z0-9]/;
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += text[i];
        if (i < text.length - 1) {
            const currentChar = text[i];
            const nextChar = text[i + 1];
            if (
                (chineseRegex.test(currentChar) && alphaNumericRegex.test(nextChar)) ||
                (alphaNumericRegex.test(currentChar) && chineseRegex.test(nextChar))
            ) {
                result += ' ';
            }
        }
    }
    return result;
}

// 将Canvas保存为图片并添加到页面
function saveCanvasAsImage(canvas, index) {
    console.log(`正在保存第${index}张图片`);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    const img = new Image();
    img.src = dataUrl;
    img.alt = `Generated Image ${index}`;
    img.style.maxWidth = '100%';
    img.style.marginBottom = '20px';
    
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = `xiaohongshu_image_${String(index).padStart(3, '0')}.jpg`; // 修改这里
    downloadLink.appendChild(img);
    
    imageContainer.appendChild(downloadLink);
    
    generatedImages.push({
        dataUrl: dataUrl,
        index: index
    });
    
    downloadAllButton.textContent = `一键下载 ${generatedImages.length} 张图片`;
    
    console.log(`第${index}张图片已添加到页面和 generatedImages 数组`);
}

// 下载所有图片
function downloadAllImages() {
    console.log('开始下载所有图片');
    const images = document.querySelectorAll('#imageContainer img');
    const totalImages = images.length;

    console.log(`共找到 ${totalImages} 张图片`);

    if (totalImages === 0) {
        console.log('没有可下载的图片');
        showMessage('没有可下载的图片');
        return;
    }

    let downloadCount = 0;
    images.forEach((img, index) => {
        const dataUrl = img.src;
        const filename = `xiaohongshu_image_${String(index + 1).padStart(3, '0')}.jpg`;
        
        downloadImage(dataUrl, filename).then(() => {
            console.log(`已下载图片 ${index + 1}`);
            downloadCount++;
            if (downloadCount === totalImages) {
                showMessage(`下载成功！共下载 ${totalImages} 张图片。`);
            }
        }).catch(error => {
            console.error('下载图片时出错:', error);
            showMessage('下载出错，请重试');
        });
    });
}

// 下载单个图片
function downloadImage(dataUrl, filename) {
    return new Promise((resolve, reject) => {
        console.log(`开始下载图片: ${filename}`);
        if (isExtension) {
            // Chrome扩展环境下的下载逻辑
            chrome.downloads.download({
                url: dataUrl,
                filename: filename,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('下载图片时出错:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`图片下载完成: ${filename}`);
                    resolve();
                }
            });
        } else {
            // 普通网页环境下的下载逻辑
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    console.log(`图片下载完成: ${filename}`);
                    resolve();
                })
                .catch(err => {
                    console.error('下载图片时出错:', err);
                    reject(err);
                });
        }
    });
}

// 显示消息
function showMessage(message) {
    const messageElement = document.getElementById('downloadMessage');
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// 下载文件
function downloadFile() {
    // 模拟下载过程
    console.log('开始下载文件');

    // 1秒后显示下载成功提示
    setTimeout(() => {
        alert('下载成功！');
        console.log('显示下载成功提示');
    }, 1000);
}

// 确保在某个事件触发时调用这个函数，例如：
document.getElementById('downloadButton').addEventListener('click', downloadFile);

console.log('脚本加载完成');