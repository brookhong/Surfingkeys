# Surfingkeys -- 用javascript和键盘扩展你的chrome

Surfingkeys和现有的一些插件，如[philc/vimium](https://github.com/philc/vimium)和[1995eaton/chromium-vim](https://github.com/1995eaton/chromium-vim)一样，让你尽可能的通过键盘来使用chrome浏览器，比如跳转网页，上下左右滚屏。但不只是给vim用户使用，Surfingkeys的基本特性是让你自己写一段Javascript脚本，然后通过`mapkey`映射到某些按键。之后当你按了那几个键以后，对应的Javascript脚本就会被执行。

我先是用了一年的vimium，大概半年前又切到了chromium-vim。之所以要自己重新造一个类似的轮子，是因为我发现要在这些插件里加上我自己的需求，需要改很多地方。比如，我就试图把下面这两个功能加入其中

* 用某种搜索引擎搜索选中的文本
* 双击某个单词获取中文翻译

Surfingkeys的配置全部写在一段javascript中，很容易添加自己的映射按键。如：

    mapkey('c-y', 'Show me the money', function() {
        alert('a well-known phrase uttered by characters in the 1996 film Jerry Maguire');
    });

[配置参考](#edit-your-own-settings).

## 哪些功能是Surfingkeys不同于其他插件的？
* 所有配置都用javascript描述，易于修改添加自己的按键。
* 一个大号光标，这样visual mode不会太痛苦。
* 我最喜欢的功能 -- 搜索选中文本，在normal mode和visual mode都好用。
* 自动生成帮助信息。
* 在visual mode下，按`*` 可以搜索当前单词。
* 滚动操作（像`e` `d`上下翻页之类）可以在顶层页面工作，也可以在一个支持滚动的DIV中使用。
* 在一个有多个frame的页面中，`w`可以切换frame。

## 快速上手
安装本插件以后，打开你要访问的站点。先按`u`或者`Ctrl-i`看看帮助信息，按`Esc`可以关掉帮助信息。

试试帮助信息里的那些按键，比如，`e`向上翻页，`d`向下翻页，`se`打开设置。

## Surfingkeys支持的模式

Surfingkeys目前只有两种模式。

### Normal mode，默认模式

通过函数`mapkey`添加的所有按键都只在这种模式下有用。

### Visual mode，用于选中文本，以及各种针对选中文本的操作

除了通过函数`vmapkey`添加的所有按键在这种模式下有用，此外还有一些内置类似vim的按键，如`j` `k` `h` `l` `b` `w``0` `$`等。

按`v`可以切换visual mode。在visual mode下，你会在页面底部看到一个提示 -- `Caret`或者`Range`，页面中还有一个大号的光标。光标做得这么大，是让人在页面中好找到它。

`Caret` 表明当你按jkhl时会移动光标，`Range`则表明你移动光标会选择文本。下面有个小练习：

1. 按下`v`，确认你能看到`Caret`提示和光标。
1. 使用`j` `k` `h` `l` `b` `w``0` `$`试试移动光标。
1. 再按下`v`，确认你看到`Range`提示。
1. 使用`j` `k` `h` `l` `b` `w``0` `$`试试选中文本。
1. 按下`sg`看看发生了什么。
1. 再按下`v`回到normal mode。

### 查找

查找不是模式，但是它会让你自动进入visual mode. 按`/`打开查找栏，输入你要查找的文字，你会看到所有匹配的文字会被高亮。按回车完成查找，这时你会自动进入visual mode -- `Caret`。按`n`定位下一个，`N`定位前一个。

## 搜索选中文本

从使用Firefox时起，我就必装的一个插件。无论Firefox还是Chrome，我用的插件都是通过右键菜单来实现的。Surfingkeys则通过按键来实现。默认情况下，当你在normal mode下按`sg`，Surfingkeys会打开google搜索选中文本，如果没有文字被选中，则搜索系统剪贴板里面的文字。在visual mode下，它只会搜索选中文本。

`sg`里面的`g`是个别名，用于google，还有其他一些内置的别名，如`b`是百度的别名。这样当你按`sb`的时候就是使用百度来搜索选中文本。参考[Add search alias to omnibar](#add-search-alias-to-omnibar)来添加你自己的搜索别名，尤其那些用于公司内部的搜索。


## License

MIT License
