# Surfingkeys -- 用javascript和键盘扩展你的chrome


[![Node CI](https://github.com/brookhong/Surfingkeys/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/brookhong/Surfingkeys/actions?query=workflow%3A%22Node+CI%22+branch%3Amaster)

Surfingkeys和现有的一些插件一样，让你尽可能的通过键盘来使用Chrome/Firefox浏览器，比如跳转网页，上下左右滚屏。但不只是给vim用户使用，Surfingkeys的基本特性是让你自己写一段Javascript脚本，然后通过`mapkey`映射到某些按键。之后当你按了那几个键以后，对应的Javascript脚本就会被执行。

Surfingkeys的配置全部写在一段javascript中，很容易添加自己的映射按键。如：

    api.mapkey('<Ctrl-y>', 'Show me the money', function() {
        api.Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

Surfingkeys从0.9.15开始支持火狐（需要57以上的版本），但目前下面的功能在火狐下不工作：
* 同步不同设备间的设置
* 代理设置
* Markdown预览

Surfingkeys尽量让用户使用键盘进行网页浏览，但有些限制是Google Chrome本身的，如果想要更彻底的体验请试试[Brook的Chromium浏览器](https://brookhong.github.io/2021/04/18/brook-build-of-chromium-cn.html)。

## 安装

* [Surfingkeys - Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc)
* [Surfingkeys – Get this Extension for 🦊 Firefox](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/)
* [Surfingkeys - Microsoft Edge Addons](https://microsoftedge.microsoft.com/addons/detail/kgnghhfkloifoabeaobjkgagcecbnppg)
* [Surfingkeys on the Mac App Store](https://apps.apple.com/us/app/surfingkeys/id1609752330)

### 目录

* [功能特性](#功能特性)
* [快速上手](#快速上手)
* [打开连接](#打开连接)
* [Surfingkeys支持的模式](#surfingkeys支持的模式)
* [搜索栏](#搜索栏)
* [搜索选中文本](#搜索选中文本)
* [类vim标示](#类vim标示)
* [切换标签页](#切换标签页)
* [窗口管理](#窗口管理)
* [命令](#命令)
* [顺滑滚动](#顺滑滚动)
* [会话管理](#会话管理)
* [前缀数字可多次重复相应操作](#前缀数字可多次重复相应操作)
* [开关热键](#开关热键)
* [代理设置](#代理设置)
* [VIM编辑器或者Emacs编辑器](#vim编辑器或者emacs编辑器)
* [点命令重复前一个操作](#点命令重复前一个操作)
* [Markdown预览](#markdown预览)
* [截屏](#截屏)
* [PDF阅读器](#pdf阅读器)
* [配置参考](#配置参考)
* [编译](#编译)
* [License](#license)

## 功能特性
* 所有配置都用javascript描述，易于修改添加自己的按键。
* 一个大号光标，这样visual mode不会太痛苦。
* 搜索选中文本，在normal mode和visual mode都好用。
* 自动生成帮助信息。
* 在visual mode下，按`*` 可以搜索当前单词。
* 滚动操作（像`e` `d`上下翻页之类）可以在顶层页面工作，也可以在一个支持滚动的DIV中使用。
* 在一个有多个frame的页面中，`w`可以切换frame。
* 会话管理。
* 一个多功能书签地址栏
* 前缀数字可多次重复相应操作
* 使用VIM编辑页面上各种输入框
* 点命令重复前一个操作
* `;pm`预览markdown
* 插入模式下的表情下拉选项
* 按键实时提示
* 所有按键对PDF适用
* Regional Hints mode
* 大语言模型对话

## 快速上手

* [Chrome插件安装地址](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc)
* [Firefox插件安装地址](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/)

安装本插件以后，打开你要访问的站点。先按`?`或者`u`看看帮助信息，按`Esc`可以关掉帮助信息。

试试帮助信息里的那些按键，比如，`e`向上翻页，`d`向下翻页，`;e`打开设置。

* `?` 显示帮助
![help](https://cloud.githubusercontent.com/assets/288207/16181995/1417ca44-36d4-11e6-96c9-9e84b33f0916.png)
* `t` 搜索收藏夹和访问历史
![urls](https://cloud.githubusercontent.com/assets/288207/16182031/58e15ec4-36d4-11e6-9cc5-ff35970df25f.png)
* `/` 在当前页查找
![find](https://cloud.githubusercontent.com/assets/288207/16182044/65f4713c-36d4-11e6-9e21-6b61a858f080.png)
* `f` 拨号打开链接
![follow](https://cloud.githubusercontent.com/assets/288207/16182118/18d27678-36d5-11e6-9759-d8b5ff49930c.png)
* `v` 切换文本选择模式
![visual](https://cloud.githubusercontent.com/assets/288207/16182120/1cc536da-36d5-11e6-9e08-293cdb8fbcd2.png)
* `T` 切换标签页
![tabs](https://cloud.githubusercontent.com/assets/288207/10328839/f0143ffe-6ceb-11e5-8eee-962db94b2c22.png)

## Surfingkeys支持的模式

Surfingkeys有三种模式：normal，visual和insert。

### Normal mode，默认模式

当你打开一个页面时，自动进入该模式。通过函数`mapkey`添加的所有按键都只在这种模式下有用。

### Visual mode，用于选中文本，以及各种针对选中文本的操作

除了通过函数`vmapkey`添加的所有按键在这种模式下有用，此外还有一些内置类似vim的按键，如`j` `k` `h` `l` `b` `w` `0` `$`等。

按`v`可以切换visual mode。在visual mode下，你会在页面底部看到一个提示 -- `Caret`或者`Range`，页面中还有一个大号的光标。光标做得这么大，是让人在页面中好找到它。

`Caret` 表明当你按jkhl时会移动光标，`Range`则表明你移动光标会选择文本。下面有个小练习：

1. 按下`v`，确认你能看到`Caret`提示和光标。
1. 使用`j` `k` `h` `l` `b` `w` `0` `$`试试移动光标。
1. 再按下`v`，确认你看到`Range`提示。
1. 使用`j` `k` `h` `l` `b` `w` `0` `$`试试选中文本。
1. 按下`sg`看看发生了什么。
1. 再按下`v`回到normal mode。

![search_selected](https://cloud.githubusercontent.com/assets/288207/17644215/759f1e70-61b3-11e6-8bf8-0bdff7d0c933.gif)

* `zz` 让光标位于窗口中间行。
* `f` 往前查找下一个字符。
* `F` 往后查找下一个字符。
* `;` 重复最后的`f`/`F`操作。
* `,` 反向重复最后的`f`/`F`操作。

### Hints mode
按`f`键进入Hints mode可以打开链接，也有其它行为不同的组合，比如`cf`可以连续打开链接，`af`指定在新标签页打开。

默认的拨号键有`asdfgqwertzxcvb`，如果按了一个非拨号键，会自动退出拨号。下面的设置可以改成右手习惯：

    Hints.characters = 'yuiophjklnm'; // for right hand

当拨号盘有重叠上，可以按`Shift`翻转重叠的拨号盘。按住空格键可隐藏拨号盘，松开恢复。

所有拨号放在目标链接的中间，你可以用下面的设置让它们靠左对齐：

    settings.hintAlign = "left";

#### Regional Hints mode

按`L`键选择一个大块元素进入Regional Hints mode，目前自带的操作有

* `Esc` 退出Regional Hints mode
* `ct` 复制该大块元素的文本
* `ch` 复制该大块元素的HTML
* `d` 删除该大块元素
* `l` 与大语言模型讨论选中文本

[Demo on YouTube](https://www.youtube.com/watch?v=pFPOzAZDO38)

### Insert mode

当输入焦点定位到各类输入框时（无论你是通过`i`或`f`选择定位还是鼠标点击定位的），就进入该模式。
通过函数`imapkey`添加的所有按键都只在这种模式下有用。

* `Ctrl - i` 打开vim编辑器。
* `Ctrl - '` 把输入框里的内容用双引号引起来或去除双引号，方便在搜索引擎页面上搜索时使用。
* `Ctrl-e`移动光标到行尾。
* `Ctrl-a` 移动光标到行首， 在Windows下用`Ctrl-f`避免和全选冲突。
* `Ctrl-u` 删除光标前所有输入。
* `Alt-b` 移动光标到后一个词。
* `Alt-f` 移动光标到前一个词。
* `Alt-w` 往后删除一个词。
* `Alt-d` 往前删除一个词。

`imap` 和 `iunmap`：

    api.imap(',,', "<Esc>");        // 按两次逗号退出当前输入框。
    api.imap(';;', "<Ctrl-'>");     // 按两次分号切换双引号。


#### 表情下拉选项

当用户在插入模式下输入一个冒号跟着两个字符（2是通过`settings.startToShowEmoji`设置的）时，如`:gr`，Surfingkeys会列出相应的表情。

![emoji](https://cloud.githubusercontent.com/assets/288207/23602453/924ed762-028b-11e7-86f3-bf315c0a2499.gif)

如果你不喜欢这个功能，可以用以下设置禁用：

    api.iunmap(":");

如果你希望按下冒号后立刻出现表情下拉选项，可以用以下设置：

    settings.startToShowEmoji = 0;

[表情符号完整列表](https://github.com/brookhong/Surfingkeys/blob/master/src/pages/emoji.tsv)

### 查找

查找不是模式，但是它会让你自动进入visual mode. 按`/`打开查找栏，输入你要查找的文字，你会看到所有匹配的文字会被高亮。按回车完成查找，这时你会自动进入visual mode -- `Caret`。按`n`定位下一个，`N`定位前一个。

按`Ctrl-Enter`查找完整的单词，就像输入`\bkeyword\b`一样。

### PassThrough mode

按`Alt-i`进入PassThrough模式可让你暂时放弃SurfingKeys，这时SurfingKeys所有按键不再有用，直到你按`Esc`退出PassThrough模式。在该模式下，你可以充分使用任何网站本身提供的快捷键。请参考[Feature Request: implement Vimium-style insert mode · Issue #656](https://github.com/brookhong/Surfingkeys/issues/656)了解为什么引入这种模式以及它与`Alt-s`的区别。

按`p`进入一个短暂的PassThrough模式，它在一秒后会自动退出。如果默认设置的1秒超时不适合你的情况，可以在你的设置脚本里这样写改为1500毫秒：

    api.mapkey('p', '#0enter ephemeral PassThrough mode to temporarily suppress SurfingKeys', function() {
        api.Normal.passThrough(1500);
    });
### Lurk mode

用户可以指定在哪些页面Surfingkeys默认进入Lurk模式，直到通过`Alt-i`或者`p`（短暂的）唤醒，

    settings.lurkingPattern = /https:\/\/github\.com|.*confluence.*/i;

如果当前页面匹配`lurkingPattern`，Surfingkeys自动潜伏，此时用户必须通过`Alt-i`或者`p`唤醒才能进入正常模式，如果用户在正常模式下按`Esc`或者超时，Surfingkeys会退回潜伏模式。

可使用`lmap`修改默认按键，如，

    api.lmap("<Alt-j>", "<Alt-i>");

任务栏里的Surfingkeys图标会反应当前状态：

* 灰色 -- 禁用
* 半灰半彩 -- 潜伏
* 彩色 -- 启用

## 搜索栏

一些需要用户输入的功能通过搜索栏提供，比如

* 用`t`打开网页（从收藏夹或访问历史）
* 用`b`打开收藏夹
* 用`og`/`ob`等打开搜索引擎
* 用`:`打开命令模式

### 搜索栏按键
* `Enter` 打开选中项并关闭搜索栏。
* `Ctrl-Enter` 打开选中项，但不关闭搜索栏，你可以继续选中打开。
* `Shift-Enter` 在当前标签页打开选中项并关闭搜索栏。如果你希望默认就在当前标签页打开，可以使用`go`。
* `Tab` 在结果列表中向下切换。
* `Shift-Tab` 在结果列表中向上切换。
* `Ctrl-.` 显示下一页搜索结果
* `Ctrl-,` 显示上一页搜索结果
* `Ctrl-c` 复制当前列出的结果

用`t`打开搜索栏时，

`Ctrl - d` 可以从收藏夹或访问历史中删除选中项。

用`b`打开搜索栏时，

`Ctrl - Shift - <any letter>` 创建相应的类似vim标示。

![search_engine](https://cloud.githubusercontent.com/assets/288207/17644214/759ef1d4-61b3-11e6-9bd9-70c38c8b80e0.gif)

`cmap`用于搜索栏修改按键，如：

    api.cmap('<Ctrl-n>', '<Tab>');
    api.cmap('<Ctrl-p>', '<Shift-Tab>');

### 添加书签
`ab`可以把当前页加入书签。按`ab`后，搜索栏会弹出来让你选择放到哪个目录。如果你希望放到一个新建目录下面，可以输入新的目录名，**并以`/`结尾**，比如我选中了`/Bookmarks Bar/tool/`，然后在后面输入`abc/`，会把当前页加到`/Bookmarks Bar/tool/abc/`这个目录里。如果`abc`后面没有`/`，`abc`会被当作新建书签的标题保存。

## 搜索选中文本

从使用Firefox时起，我就必装的一个插件。无论Firefox还是Chrome，我用的插件都是通过右键菜单来实现的。Surfingkeys则通过按键来实现。默认情况下，当你在normal mode下按`sg`，Surfingkeys会打开google搜索选中文本，如果没有文字被选中，则搜索系统剪贴板里面的文字。在visual mode下，它只会搜索选中文本。

`sg`里面的`g`是个别名，用于google，还有其他一些内置的别名，如`b`是百度的别名。这样当你按`sb`的时候就是使用百度来搜索选中文本。参考[在搜索栏里添加搜索别名](https://github.com/brookhong/Surfingkeys/blob/master/docs/API.md#addsearchalias)来添加你自己的搜索别名，尤其那些用于公司内部的搜索。

此外，还有`sog`可以使用google在本站搜索选中文本。在这个`sog`里面，`s`是search_leader_key，`o`是only_this_site_key，`g`是搜索别名。

search_leader_key(`s`)加上大写的别名(`G`)会打开搜索框让你可以修改添加搜索内容，再用Google搜索。其它别名和你通过`addSearchAlias`添加的别名，大写的都可以这样工作。

## 类vim标示

简单说，vim中的marks就是按`m`，然后跟一个字符（0-9 / a-z / A-Z），标示一下当前网址。之后，你随时按`'`跟上你定义的那个标示符，就会跳转到该网址。

除了`m`键创建标示外，你还可以从收藏夹里按住Ctrl，加上标示符来创建。如下：

1. 按下`b`打开收藏夹。
1. 随便输点啥，定位到你要标示的网址。
1. 按住Ctrl + Shift，加上你选中的标示符，比如`f`。

之后，按`'F`就可以直接打开该网址来。

这个功能对那些你需要经常访问对网址很有用，两个键直达。`om`可以查看你已创建的标示。

## 切换标签页

默认情况下，按`T`会显示所有已打开标签页，然后按相应的提示键可以切到该标签页。

![tabs_overlay](https://github.com/brookhong/Surfingkeys/assets/288207/f0ca339d-133f-4fb0-b902-cdc64fc71374)

如果你按的键没有匹配到任何标签，搜索栏会自动打开。因此你可以直接按一个标签提示符中不存在的键比如`;`或者`j`直接打开搜索栏来搜索标签。

这里也有个设置`settings.tabsThreshold`，当然打开的标签页总数超过它时，再按空格就会使用搜索栏来选择标签。

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

如果你希望一直用搜索栏来选择标签页，可使用如下设置:

    api.mapkey('<Space>', 'Choose a tab with omnibar', function() {
        api.Front.openOmnibar({type: "Tabs"});
    });

效果相当于：

    settings.tabsThreshold = 0;

无论是否在搜索栏里，标签页都按最近使用的顺序列出。如果你希望按标签页原本的顺序列出，可以设置：

    settings.tabsMRUOrder = false;

## 窗口管理

`W`会列出所有窗口，你可以选择其中一个，然后按回车键把当面标签页移到选定的窗口。如果当前浏览器只有一个窗口，`W`就直接把当前标签页移到一个新的窗口。

`;gt`打开搜索栏列出所有不在当前窗口里的标签页，你可以输入文本过滤标签页，然后按回车键把所有过滤出来的标签页移到当前窗口。`;gw`则把所有窗口的所有标签页移到当前窗口。

这样，管理窗口的各种标签页，你可以用`W`移动某一个标签页到指定窗口，也可以用`;gt`来收集包含特定关键词的标签页到当前窗口。

## 命令

用`:`打开搜索栏可用于执行命令，命令执行结果会显示在搜索栏下方。

    // 映射不同的按键到该命令，但采用不同的参数。
    api.map(';pa', ':setProxyMode always');
    api.map(';pb', ':setProxyMode byhost');
    api.map(';pd', ':setProxyMode direct');

除了命令，你还可以执行各类简单js代码。

![commands_in_omnibar](https://cloud.githubusercontent.com/assets/288207/11527801/fadee82c-991d-11e5-92e9-b054796a6a75.png)

## 顺滑滚动

所有可以滚动的对象都默认支持顺滑滚动，如下可以关掉顺滑特性：

    settings.smoothScroll = false;

`j`/`k` 按一步70像素的距离滚动，你可以定制步长：

    settings.scrollStepSize = 140;

## 会话管理

用Surfingkeys在Chrome里保存会话相当于保存所有标签页的地址，打开会话则相当于在不同的标签页中打开所有保存其中的网页地址，所以会话基本上就是一个网页地址列表，每个会话有自己的名字。

* `ZZ`会保存所有当前标签页到一个名为`LAST`的会话，然后退出。
* `ZR`恢复名为`LAST`的会话。
* `ZQ`就只退出，不保存当前会话。

你可以在命令模式下创建／管理多个不同名称的会话。按`:`打开命令窗口，然后输入:

    createSession works

就会创建一个名为`works`的会话，要打开该会话使用如下命令：

    openSession works

列出已保存的所有会话：

    listSession

删除某个会话：

    deleteSession works

## 前缀数字可多次重复相应操作

如果需要重复多次某个操作，可以在按该映射键之前按下相应的数字，比如`3d`，就会往下滚3页。这种方法同样适用于标签操作，比如，你现在在第一个标签页，你想切换到第四个标签页，

* 按`3R`就可以
* `3E`会切回到第一个标签页

另一个例子是移动标签页，假设你现在开着23个标签页，你在第12个，

* `11<<` 就把当前标签页移到第一个
* `10>>` 则会把它移到最后一个

通常情况，你不需要去数多少个标签页，如果你只是想移动到开头或者结尾的话，你按一个足够大的数字就可以，比如`99<<`。

## 开关热键

默认情况下，按`Alt-s`可以在当前站点开关Surfingkeys。当Surfingkeys处于关闭状态时，除了热键，其它所有按键映射都停止工作。用如下设置修改热键：

    api.map('<Ctrl-i>', '<Alt-s>'); // 热键只能是一个按键，但可以带辅助按键，不能是`gg`这样的一串按键。

当Surfingkeys在某个网站被`Alt-s`关掉时，这个状态会被保存在设置里，如

    "blocklist": {
        "https://github.com": 1
    },

再按一次`Alt-s`会从settings.blocklist中删除该站点。这类状态并不保存在设置脚本里，你可以按`yj`把当前所有设置复制到系统剪贴板，然后粘贴到文本编辑器里查看。

另一个禁用Surfingkeys的方法是用`settings.blocklistPattern`，请参考[regex for disabling](https://github.com/brookhong/Surfingkeys/issues/63).

## 代理设置

SwitchySharp是个很好的代理管理插件，但我的用法很简单，

1. 创建一个使用PAC脚本的配置。
1. 在PAC脚本里维护一个网站列表，如果当前所访问的站点在其中就使用代理。
1. 当碰到一个站点是被墙的，就把这个网站加入列表。
1. 然后点击SwitchySharp的图标重载配置。
1. 有时也会点击图标在配置之间切换。

其中需要手工编辑PAC脚本，鼠标点击SwitchySharp图片切换重载配置，因此我把代理设置的功能集成进来，并提供相关的命令和快捷键。

* setProxy, 设置代理，示例如下：

        setProxy 192.168.1.100:8080
        setProxy 127.0.0.1:1080 SOCKS5

* setProxyMode, 设置代理模式，有五种模式：direct, byhost, bypass, always, system 和 clear。

        direct      Chrome不使用代理访问任何网站。
        byhost      Chrome只在访问你添加过的网站时使用代理。你可以添加多条映射，让不同的网站使用不同的代理。
        bypass      Chrome使用代理访问所有网站，除了添加过的网站。
        always      Chrome使用代理访问所有网站。
        system      Chrome使用操作系统设置的代理。
        clear       Surfingkeys不管代理，有其他插件管理，也就是禁用Surfingkeys的代理管理功能, 这是默认模式。

* `cp`, 切换当前站点的代理设置，即是否使用代理访问当前站点。

* `;pa`, `:setProxyMode always`快捷键。

* `;pb`, `:setProxyMode byhost`快捷键。

* `;pc`, `:setProxyMode clear`快捷键。

* `;pd`, `:setProxyMode direct`快捷键。

* `;ps`, `:setProxyMode system`快捷键。


## VIM编辑器或者Emacs编辑器

Surfingkeys集成了ACE里的VIM编辑器，用于：

* 编辑网页上的各类文本输入框。
* 编辑URL并在新标签页打开
* 编辑设置

你可以加上如下设置来使用Emacs按键：

    settings.aceKeybindings = "emacs";

使用Emacs按键时，用`C-x C-s`来保存你的输入。


### 编辑网页上的各类文本输入框

在Normal模式，按大写的`I`，然后按相应的字母选择一个输入框。这时会打开一个VIM编辑器。对于单行输入框`input`和多行输入框`textarea`，打开的VIM编辑器会有点细微的不同。

对于单行输入框`input`，打开的VIM编辑器只有一行，你可以通过各类VIM按键编辑你的文本，按`Enter`或者`:w`就会把VIM编辑器里的内容写回相应的输入框。

![input_with_vim](https://cloud.githubusercontent.com/assets/288207/17644219/75a72b2e-61b3-11e6-8ce2-06c9cc94aeca.gif)

对于多行输入框`textarea`，打开的VIM编辑器有多行，在你完成编辑之后，按`Ctrl-Enter`或者`:w`就会把VIM编辑器里的内容写回相应的输入框。

![textarea_with_vim](https://cloud.githubusercontent.com/assets/288207/17644217/75a27e44-61b3-11e6-8f21-9cd79d3c5776.gif)

对于下拉列表`select`，打开的VIM编辑器有多行，但你不能编辑其中的文本，你只能搜索你需要的选项，跳到那一行，然后按`Enter`选中它。这对那种有几十个以上选项的下拉列表尤其有用。

![select_with_vim](https://cloud.githubusercontent.com/assets/288207/17644218/75a458a4-61b3-11e6-8ce7-eedcc996745c.gif)

按键`Esc`或`:q`可退出VIM编辑器，不写回输入。

`Tab`键可以从当前页面上搜索匹配的词组，然后按空格键补齐。

如果你是通过按键`i`或者鼠标点击进入一个输入框的，你可以正常修改输入框中的文本，也可以随时按`Ctrl-i`打开一个VIM编辑器。

记住在插入模式，按`Ctrl-i`打开VIM编辑器。

### 编辑URL并在新标签页打开

`;u`可以打开一个VIM编辑器来编辑当前URL，然后按`Enter`或者`:w`就会打开编辑后的URL，就像一个地址栏一样，但这是一个支持vim按键的地址栏。

`Tab`键可以从书签和访问历史中搜索匹配的URL，然后按空格键补齐。

![url_with_vim](https://cloud.githubusercontent.com/assets/288207/17644220/75f8eedc-61b3-11e6-9630-da2250ac5f10.gif)

### 编辑设置

`;e`打开设置编辑器, `:w`保存设置。

## 点命令重复前一个操作

[重复前一个操作](https://github.com/brookhong/Surfingkeys/issues/67)

所有normal模式下的按键都可以由点来重复，除了那些在创建时指定`repeatIgnore`为`true`的按键，如

    api.mapkey('e', '#2Scroll a page up', function() {
        api.Normal.scroll("pageUp");
    }, {repeatIgnore: true});

这样，`.`就不会往上翻页，即使你刚刚按了`e`。

## Markdown预览

1. 复制markdown代码到系统剪贴板。
1. `;pm`预览剪贴板里的markdown。
1. 在预览页，再按`;pm`会打开vim编辑器编辑markdown。
1. `:wq`刷新预览。
1. `r`可以从系统剪贴板里重新加载markdown.

![markdown](https://cloud.githubusercontent.com/assets/288207/17669897/0b6fbaf6-6342-11e6-8583-86eb8691190d.gif)

Surfingkeys默认使用[这个markdown分析器](https://github.com/chjj/marked)，如果你想用[github提供的API](https://developer.github.com/v3/markdown/)，可以设置：

    settings.useLocalMarkdownAPI = false;

## 截屏

如果你需要截屏，下面这些按键用得上，尤其是当你想截长屏／或页面中某个可以滚动的DIV时。

* `yg` 截当前页的屏。
* `yG` 滚动截完整页。
* `yS` 截当前滚动对象的屏。

按完以上任一快捷键之后，会弹出你所截取的图片，然后你可以用鼠标（😢）右键单击图片来保存或者复制。

## PDF阅读器
为了支持PDF文件，Surfingkeys集成了来自[pdf.js](https://github.com/mozilla/pdf.js)的PDF阅读器。当你用Chrome打开一个PDF文件时，这个PDF阅读器就会打开，这样所有Surfingkeys的按键都可以用了。

如果希望使用Chrome默认的PDF阅读器打开，可以按`;s`切换。

当你使用Chrome默认PDF阅读器时，有些按键还是可用的，但部分按键比如滚动／可视模式下的按键就不可用了。

## 配置参考

### 属性设置列表

| 属性 | 默认值 | 解释 |
|:---------------|:-----|:-----|
| settings.showModeStatus | false | 是否在状态栏显示当前模式。 |
| settings.showProxyInStatusBar | false | 是否在状态栏显示代理信息。 |
| settings.richHintsForKeystroke | 500 | 超过指定毫秒数后显示按键提示，如果指定值等于0会禁用按键提示。 |
| settings.useLocalMarkdownAPI |  true | 是否使用[chjj/marked](https://github.com/chjj/marked)解析markdown，否则使用github API。 |
| settings.focusOnSaved | true | 是否在退出内嵌VIM编辑器后把光标定位到输入框。 |
| settings.omnibarMaxResults | 10 | 搜索栏下面每页显示多少条结果。 |
| settings.omnibarHistoryCacheSize | 100 | 从浏览历史记录中返回查询结果的最大条数. |
| settings.omnibarPosition | "middle" | 定义搜索框位置。 ["middle", "bottom"] |
| settings.omnibarSuggestionTimeout | 200 | 设置触发搜索引擎提示的超时，当按键过去设定毫秒后才发起搜索引擎提示的请求，这样避免每次按键就触发请求。|
| settings.focusFirstCandidate | false | 是否在搜索栏下面自动选择第一个匹配的结果。 |
| settings.tabsThreshold | 100 | 当打开标签页的数量超过设定值时，使用搜索栏来查找标签页。 |
| settings.verticalTabs | true | 是否纵向排列标签选择栏。 |
| settings.clickableSelector | "" | 自定义CSS selector用于f键选择无法检测到的可点击元素，例如"\*.jfk-button, \*.goog-flat-menu-button"。 |
| settings.clickablePat | /(https?&#124;thunder&#124;magnet):\/\/\S+/ig | 用于检测文字中可点击链接的正则表达式，你可以按`O`打开检测到的链接。|
| settings.editableSelector | div.CodeMirror-scroll,div.ace_content | 额外CSS selector以自定义可编辑元素。|
| settings.smoothScroll | true | 是否启用顺滑滚动。 |
| settings.modeAfterYank | "" | 在可视模式下，在复制文本之后，回到哪种模式，["", "Caret", "Normal"]，默认是""，指保持当前模式。 |
| settings.scrollStepSize | 70 | `j`/`k`滚动时每一步的大小。 |
| settings.scrollFriction | 0 | 在滚动一步之后，开始连续滚动所需要的力。数字大，表示需要更大的力来启动连续滚动，这样在开始连续滚动时会有一个抖动，但也能保证第一步的滚动幅度是精确的。 |
| settings.nextLinkRegex | /((>>&#124;next)+)/i | 匹配下一页链接的正则表达式。 |
| settings.prevLinkRegex | /((<<&#124;prev(ious)?)+)/i| 匹配上一页链接的正则表达式。 |
| settings.hintAlign | "center" | 拨号键与它对应的目标如何对齐。["left", "center", "right"] |
| settings.defaultSearchEngine | "g" | 搜索栏里的默认搜索引擎。 |
| settings.blocklistPattern | undefined | 如果当前访问的网站匹配设定的正则表达式，则禁用Surfingkeys。 |
| settings.focusAfterClosed | "right" | 关掉当前标签页后，切换到哪一侧的标签页。["left", "right"] |
| settings.repeatThreshold | 9 | 操作可重复最多次数。 |
| settings.tabsMRUOrder | true | 查找打开标签页时，是否按最近访问顺序列出所有标签页。 |
| settings.historyMUOrder | true | 查找访问记录时，是否按最常访问顺序列出所有访问记录。 |
| settings.newTabPosition | 'default' | 在哪个位置创建新标签页。["left", "right", "first", "default"] |
| settings.interceptedErrors | [] | 指明Surfingkeys为哪些错误显示错误页，这样在这些错误页你依然可以使用Surfingkeys。例如，["*"]为所有错误显示错误页，["net::ERR_NAME_NOT_RESOLVED"]只为ERR_NAME_NOT_RESOLVED显示错误页。更多错误请参考[net_error_list.h](https://github.com/adobe/chromium/blob/master/net/base/net_error_list.h)。  |
| settings.enableEmojiInsertion | false | 是否打开插入模式下的表情下拉选项 |
| settings.startToShowEmoji | 2 | 在冒号后输入多少个字符才显示表情下拉选项。 |
| settings.language | undefined | 帮助中使用何种语言，目前只支持中英文，设为"zh-CN"显示中文帮助。 |
| settings.stealFocusOnLoad | true | 是否阻止光标定位到输入框，默认为true，这样我们可以在页面加载结束之后直接使用Surfingkeys提供的各类按键，否则需要按Esc退出输入框。 |
| settings.enableAutoFocus | true | 是否允许光标自动定位到动态显示的输入框里。这个设置和`stealFocusOnLoad`不同，那个只是在页面加载完成后跳出输入框。比如，有一个页面上有个隐藏的输入框，它只在用户点击某个链接后显示出来。如果你不想这个刚显示出来的输入框自动获得焦点，就可以把这个设置设为false。 |
| settings.theme | undefined | 修改Surfingkeys界面风格。 |
| settings.caseSensitive | false | 网页/搜索框内搜索是否大小写敏感。 |
| settings.smartCase | true | 当搜索关键字里含有大写字符时，是否自动设为大小写敏感。 |
| settings.cursorAtEndOfInput | true | 是否在进入输入框时把光标放在结尾，为false时，光标将放在上次离开输入框时的位置。 |
| settings.digitForRepeat | true | 是否把数字输入当作重复次数，为false时，数字可作为普通按键。 |
| settings.editableBodyCare | true | 当焦点定位到一个可编辑的元素时，Insert模式会自动激活，所以如果某个window/iframe里的document.body本身就是可编辑的（例如docs.google.com），Insert模式会一直处于激活状态，这样所有Normal模式下的按键都不可用了。当`editableBodyCare`为`true`时，Insert模式在这种情况下不会自动激活。|
| settings.ignoredFrameHosts | ["https://tpc.googlesyndication.com"] | 当用`w`切换frame时，你可以用这个设置来过滤掉某些frame，比如那些做广告的frame。|
| settings.aceKeybindings | "vim" | 改为"emacs"可以在ACE编辑器里使用Emacs按键。 |
| settings.caretViewport | null | 按`[top, left, bottom, right]`格式设置，可以限制按`v`进入可视模式时的选择范围。比如`[window.innerHeight / 2 - 10, 0, window.innerHeight / 2 + 10, window.innerWidth]`会使Surfingkeys只会为显示在窗口中间的文字生成拨号盘字符。|
| settings.mouseSelectToQuery | [] | 所有启用鼠标选择查询功能的网站列表。 |
| settings.autoSpeakOnInlineQuery | false | 是否在使用inline query时自动发声。 |
| settings.showTabIndices | false | 是否在标签页标题上显示当前标签页的编号。 |
| settings.tabIndicesSeparator | "\|" | 标签页编号与标签页原始标题之间的分隔符。 |
| settings.disabledOnActiveElementPattern | undefined | 当活动元素匹配这个设置时自动停用Surfingkeys，当活动元素变了继续启用，一个比较有用的场景是可以通过这个设置允许用户在一个大的下拉列表中通过按键快速定位选项，比如 `settings.disabledOnActiveElementPattern = "ul.select-dropdown-options";` |

### settings.theme示例，修改状态栏字体

    settings.theme = `
        #sk_status, #sk_find {
            font-size: 20pt;
        }
    }`;

## 大语言模型对话
目前集成了比较常用的几个大语言模型，可用`A`调出对话窗口，

* Ollama
* Bedrock
* DeepSeek
* Gemini
* 自定义模型(例如：SiliconFlow 和 OpenRouter, 其他和OpenAI API兼容的服务应该也可以)

使用之前，必须设置相应的密钥或者API key，比如

    settings.defaultLLMProvider = "bedrock";
    settings.llm = {
        bedrock: {
            accessKeyId: '********************',
            secretAccessKey: '****************************************',
            // model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        },
        gemini: {
            apiKey: '***************************************',
        },
        ollama: {
            model: 'qwen2.5-coder:32b',
        },
        deepseek: {
            apiKey: '***********************************',
            model: 'deepseek-chat',
        },
        custom: {
            serviceUrl: 'https://api.siliconflow.cn/v1/chat/completions',
            apiKey: '***********************************',
            model: 'deepseek-ai/DeepSeek-V3.1',
        }
    };

你也可以在Visual mode下使用大语言模型对话。按`v`或`V`进入Visual mode，再按`v`选中你关注的文本，最后`A`按调出对话窗口，开始和AI就选中文本进行探讨。
另一个方式是使用Regional Hints mode选择需要与AI进行探讨的内容。按`L`选择一个区域，再按`l`调出对话窗口。

### 指定系统提示词

比如，你可以这样限定你的AI只做中英文互译

    api.mapkey('A', '#8Open llm chat', function() {
        api.Front.openOmnibar({type: "LLMChat", extra: {
            system: "You're a translator, whenever you got a message in Chinese, please just translate it into English, and if you got a message in English, please translate it to Chinese. You don't need to answer any question, just TRANSLATE."
        }});
    });

### 403 Forbidden with Ollama

在Chrome扩展中使用Ollama，你需要在启动ollama时指定`OLLAMA_ORIGINS`

Windows下

    OLLAMA_ORIGINS=chrome-extension://* ollama serve

Mac下

    launchctl setenv OLLAMA_ORIGINS chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc

Mac下同时允许在Chrome和Firefox里使用

    launchctl setenv OLLAMA_ORIGINS "chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc,moz-extension://*"

## 编译

    npm install
    npm run build

    npm run build firefox # build webextension for firefox

## Credits

* ~~[jQuery](https://github.com/jquery/jquery)~~, removed for less memory usage and better performance.
* ~~[TRIE](https://github.com/mikedeboer/trie)~~, finally replaced by my own simple implementation for less memory usage and better performance.
* [ACE vim editor](https://github.com/ajaxorg/ace), for vim editor.
* [markdown parser](https://github.com/chjj/marked), for markdown parser.
* [pdf.js](https://github.com/mozilla/pdf.js), for pdf viewer.
* [vimium](https://github.com/philc/vimium), for the days without this extension.
* [cVim](https://github.com/1995eaton/chromium-vim), for the days without this extension.

## 捐赠
Support me with [paypal](https://www.paypal.me/brookhong), or

![donation](https://raw.githubusercontent.com/brookhong/Surfingkeys/master/src/pages/donation.png)

## License

MIT License
