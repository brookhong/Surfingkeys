# Surfingkeys -- 用javascript和键盘扩展你的chrome

Surfingkeys和现有的一些插件一样，让你尽可能的通过键盘来使用Chrome/Firefox浏览器，比如跳转网页，上下左右滚屏。但不只是给vim用户使用，Surfingkeys的基本特性是让你自己写一段Javascript脚本，然后通过`mapkey`映射到某些按键。之后当你按了那几个键以后，对应的Javascript脚本就会被执行。

Surfingkeys的配置全部写在一段javascript中，很容易添加自己的映射按键。如：

    mapkey('<Ctrl-y>', 'Show me the money', function() {
        Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

Surfingkeys从0.9.15开始支持火狐（需要57以上的版本），但目前下面的功能在火狐下不工作：
* 同步不同设备间的设置
* 代理设置
* Markdown预览

[配置参考](#配置参考).

[演示](http://video.weibo.com/show?fid=1034:09ef299edbed112e9c0a66a18ffb3463)

### 目录

* [功能特性](#功能特性)
* [快速上手](#快速上手)
* [打开连接](#打开连接)
* [Surfingkeys支持的模式](#surfingkeys支持的模式)
* [搜索栏](#搜索栏)
* [搜索选中文本](#搜索选中文本)
* [类vim标示](#类vim标示)
* [切换标签页](#切换标签页)
* [命令](#命令)
* [顺滑滚动](#顺滑滚动)
* [会话管理](#会话管理)
* [前缀数字可多次重复相应操作](#前缀数字可多次重复相应操作)
* [开关热键](#开关热键)
* [代理设置](#代理设置)
* [VIM编辑器](#vim编辑器)
* [点命令重复前一个操作](#点命令重复前一个操作)
* [Markdown预览](#markdown预览)
* [截屏](#截屏)
* [mermaid图形生成器](#mermaid图形生成器)
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
* `sm`预览markdown
* `<Ctrl-Alt-d>`打开图形生成器
* 插入模式下的表情下拉选项
* 按键实时提示
* 所有按键对PDF适用

## 快速上手

* [Chrome插件安装地址](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc)
* [Firefox插件安装地址](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/)

安装本插件以后，打开你要访问的站点。先按`?`或者`u`看看帮助信息，按`Esc`可以关掉帮助信息。

试试帮助信息里的那些按键，比如，`e`向上翻页，`d`向下翻页，`se`打开设置。

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

## 打开连接

默认的拨号键有`asdfgqwertzxcvb`，如果按了一个非拨号键，会自动退出拨号。下面的设置可以改成右手习惯：

    Hints.characters = 'yuiophjklnm'; // for right hand

当拨号盘有重叠上，可以按`Shift`翻转重叠的拨号盘。按住空格键可隐藏拨号盘，松开恢复。

所有拨号放在目标链接的中间，你可以用下面的设置让它们靠左对齐：

    settings.hintAlign = "left";

## Surfingkeys支持的模式

Surfingkeys有三种模式：normal，visual和insert。

### Normal mode，默认模式

当你打开一个页面时，自动进入该模式。通过函数`mapkey`添加的所有按键都只在这种模式下有用。

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

![search_selected](https://cloud.githubusercontent.com/assets/288207/17644215/759f1e70-61b3-11e6-8bf8-0bdff7d0c933.gif)

* `zz` 让光标位于窗口中间行。
* `f` 往前查找下一个字符。
* `F` 往后查找下一个字符。
* `;` 重复最后的`f`/`F`操作。
* `,` 反向重复最后的`f`/`F`操作。

### Insert mode

当输入焦点定位到各类输入框时（无论你是通过`i`或`f`选择定位还是鼠标点击定位的），就进入该模式。
通过函数`imapkey`添加的所有按键都只在这种模式下有用。

* `Ctrl - i` 打开vim编辑器。
* `Ctrl - '` 把输入框里的内容用双引号引起来或去除双引号，方便在搜索引擎页面上搜索时使用。
* `Ctrl-e`移动光标到行尾。
* `Ctrl-f` 移动光标到行首。
* `Ctrl-u` 删除光标前所有输入。
* `Alt-b` 移动光标到后一个词。
* `Alt-f` 移动光标到前一个词。
* `Alt-w` 往后删除一个词。
* `Alt-d` 往前删除一个词。

`imap` 和 `iunmap`：

    imap(',,', "<Esc>");        // 按两次逗号退出当前输入框。
    imap(';;', "<Ctrl-'>");     // 按两次分号切换双引号。


#### 表情下拉选项

当用户在插入模式下输入一个冒号跟着两个字符（2是通过`settings.startToShowEmoji`设置的）时，如`:gr`，Surfingkeys会列出相应的表情。

![emoji](https://cloud.githubusercontent.com/assets/288207/23602453/924ed762-028b-11e7-86f3-bf315c0a2499.gif)

如果你不喜欢这个功能，可以用以下设置禁用：

    iunmap(":");

如果你希望按下冒号后立刻出现表情下拉选项，可以用以下设置：

    settings.startToShowEmoji = 0;

[表情符号完整列表](https://github.com/brookhong/Surfingkeys/blob/master/pages/emoji.tsv)

### 查找

查找不是模式，但是它会让你自动进入visual mode. 按`/`打开查找栏，输入你要查找的文字，你会看到所有匹配的文字会被高亮。按回车完成查找，这时你会自动进入visual mode -- `Caret`。按`n`定位下一个，`N`定位前一个。

按`Ctrl-Enter`查找完整的单词，就像输入`\bkeyword\b`一样。

### 按键测试

`spk`可以打开按键测试模式。

在这个辅助模式下，你每按下一按键，Surfingkeys按显示出来，便于你确定mapkey的第一个参数。

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

`Ctrl - Shift - <any letter>` 创建相应的类似vim的全局标示。

![search_engine](https://cloud.githubusercontent.com/assets/288207/17644214/759ef1d4-61b3-11e6-9bd9-70c38c8b80e0.gif)

`cmap`用于搜索栏修改按键，如：

    cmap('<Ctrl-n>', '<Tab>');
    cmap('<Ctrl-p>', '<Shift-Tab>');

## 搜索选中文本

从使用Firefox时起，我就必装的一个插件。无论Firefox还是Chrome，我用的插件都是通过右键菜单来实现的。Surfingkeys则通过按键来实现。默认情况下，当你在normal mode下按`sg`，Surfingkeys会打开google搜索选中文本，如果没有文字被选中，则搜索系统剪贴板里面的文字。在visual mode下，它只会搜索选中文本。

`sg`里面的`g`是个别名，用于google，还有其他一些内置的别名，如`b`是百度的别名。这样当你按`sb`的时候就是使用百度来搜索选中文本。参考[在搜索栏里添加搜索别名](#在搜索栏里添加搜索别名)来添加你自己的搜索别名，尤其那些用于公司内部的搜索。

此外，还有`sog`可以使用google在本站搜索选中文本。在这个`sog`里面，`s`是search_leader_key，`o`是only_this_site_key，`g`是搜索别名。

search_leader_key(`s`)加上大写的别名(`G`)会打开搜索框让你可以修改添加搜索内容，再用Google搜索。其它别名和你通过`addSearchAliasX`添加的别名，大写的都可以这样工作。

## 类vim标示

简单说，vim中的marks就是按`m`，然后跟一个字符（a-z为当前页内标示，其它的如0-9，A-Z为全局标示），标示一下当前网址。之后，你随时按`'`跟上你定义的那个标示符，就会跳转到该网址。

除了`m`键创建标示外，你还可以从收藏夹里按住Ctrl，加上标示符来创建。如下：

1. 按下`b`打开收藏夹。
1. 随便输点啥，定位到你要标示的网址。
1. 按住Ctrl，加上你选中的标示符，比如`f`。

之后，按`'F`就可以直接打开该网址来。

这个功能对那些你需要经常访问对网址很有用，两个键直达。`om`可以查看你已创建的标示。

## 切换标签页

默认情况下，按`T`会显示所有已打开标签页，然后按相应的提示键可以切到该标签页。

![tabs_overlay](https://cloud.githubusercontent.com/assets/288207/10544636/245447f6-7457-11e5-8372-62b8f6337158.png)

这里有个设置`settings.tabsThreshold`，当然打开的标签页总数超过它时，再按空格就会使用搜索栏来选择标签。

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

如果你希望一直用搜索栏来选择标签页，可使用如下设置:

    mapkey('<Space>', 'Choose a tab with omnibar', function() {
        Front.openOmnibar({type: "Tabs"});
    });

效果相当于：

    settings.tabsThreshold = 0;

无论是否在搜索栏里，标签页都按最近使用的顺序列出。如果你希望按标签页原本的顺序列出，可以设置：

    settings.tabsMRUOrder = false;

## 命令

用`:`打开搜索栏可用于执行命令，命令执行结果会显示在搜索栏下方。

    // 映射不同的按键到该命令，但采用不同的参数。
    map('spa', ':setProxyMode always');
    map('spb', ':setProxyMode byhost');
    map('spd', ':setProxyMode direct');

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

    map('<Ctrl-i>', '<Alt-s>'); // 热键只能是一个按键，但可以带辅助按键，不能是`gg`这样的一串按键。

当Surfingkeys在某个网站被`Alt-s`关掉时，这个状态会被保存在设置里，如

    "blacklist": {
        "https://github.com": 1
    },

再按一次`Alt-s`会从settings.blacklist中删除该站点。这类状态并不保存在设置脚本里，你可以按`yj`把当前所有设置复制到系统剪贴板，然后粘贴到文本编辑器里查看。

另一个禁用Surfingkeys的方法是用`settings.blacklistPattern`，请参考[regex for disabling](https://github.com/brookhong/Surfingkeys/issues/63).

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
        byhost      Chrome只在访问你通过`addProxySite`命令添加过的网站时使用代理。你可以添加多条映射，让不同的网站使用不同的代理。
        bypass      Chrome使用代理访问所有网站，除了通过`addProxySite`命令添加过的网站。
        always      Chrome使用代理访问所有网站。
        system      Chrome使用操作系统设置的代理。
        clear       Surfingkeys不管代理，有其他插件管理，也就是禁用Surfingkeys的代理管理功能, 这是默认模式。

* addProxySite, removeProxySite, toggleProxySite, 管理你需要通过代理访问的网站，比如：

        addProxySite google.com,facebook.com,twitter.com

* proxyInfo, 列出你当前的代理设置，包括用以上命令设置的信息。

* `cp`, 切换当前站点的代理设置，即是否使用代理访问当前站点。

* `spa`, `:setProxyMode always`快捷键。

* `spb`, `:setProxyMode byhost`快捷键。

* `spc`, `:setProxyMode clear`快捷键。

* `spd`, `:setProxyMode direct`快捷键。

* `sps`, `:setProxyMode system`快捷键。

* `spi`, `:proxyInfo`快捷键。

## VIM编辑器

Surfingkeys集成了ACE里的VIM编辑器，用于：

* 编辑网页上的各类文本输入框。
* 编辑URL并在新标签页打开
* 编辑设置

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

`su`可以打开一个VIM编辑器来编辑当前URL，然后按`Enter`或者`:w`就会打开编辑后的URL，就像一个地址栏一样，但这是一个支持vim按键的地址栏。

`Tab`键可以从书签和访问历史中搜索匹配的URL，然后按空格键补齐。

![url_with_vim](https://cloud.githubusercontent.com/assets/288207/17644220/75f8eedc-61b3-11e6-9630-da2250ac5f10.gif)

### 编辑设置

`se`打开设置编辑器, `:w`保存设置。

## 点命令重复前一个操作

[重复前一个操作](https://github.com/brookhong/Surfingkeys/issues/67)

所有normal模式下的按键都可以由点来重复，除了那些在创建时指定`repeatIgnore`为`true`的按键，如

    mapkey('e', '#2Scroll a page up', function() {
        Normal.scroll("pageUp");
    }, {repeatIgnore: true});

这样，`.`就不会往上翻页，即使你刚刚按了`e`。

## Markdown预览

1. 复制markdown代码到系统剪贴板。
1. `sm`预览剪贴板里的markdown。
1. 在预览页，再按`sm`会打开vim编辑器编辑markdown。
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

## mermaid图形生成器

[Mermaid](https://github.com/knsv/mermaid) 是一个从文本生成各类图形如类图／时序图的工具。Surfingkeys提供了一个页面，可以从系统剪贴板里读取文本并生成图形，并可以用vim编辑器编辑。

按`Ctrl-Alt-d`打开。

## PDF阅读器
为了支持PDF文件，Surfingkeys集成了来自[pdf.js](https://github.com/mozilla/pdf.js)的PDF阅读器。当你用Chrome打开一个PDF文件时，这个PDF阅读器就会打开，这样所有Surfingkeys的按键都可以用了。

如果希望使用Chrome默认的PDF阅读器打开，可以按`;s`切换。

当你使用Chrome默认PDF阅读器时，有些按键还是可用的，但部分按键比如滚动／可视模式下的按键就不可用了。

## 配置参考

### 添加一个按键映射

    mapkey(keystroke, help_string, action_code, [options])

| 参数  | 含义 |
|:---------------| :-----|
|**keystroke**                   | 字符串，触发某个操作的按键|
|**help_string**                 | 字符串，帮助描述，会自动出现在`u`打开的帮助小窗里。|
|**action_code**                 | 函数，一个Javascript函数。如果该函数需要一个参数，下一个按键会作为参数传给这个函数。|
|**options**                     | object, 字段属性如下 |
|**domain**                      | 正则表达式[可选]，表明只有当域名匹配时，该按键映射才会生效。比如，`/github\.com/i` 说明按键映射只在github.com上生效。|
|**repeatIgnore**                | 布尔值[可选]，是否可通过点命令重复该按键。|

一个示例，在不同网站上映射相同的按键到不同的操作：

    mapkey('zz', 'Choose a tab', function() {
        Front.chooseTab();
    }, {domain: /github\.com/i});
    mapkey('zz', 'Show usage', function() {
        Front.showUsage();
    }, {domain: /google\.com/i});

可视化模式下的mapkey

    vmapkey(keystroke, help_string, action_code, [options])

### 映射按键到其他按键

    map(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

    imap(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

    vmap(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

    cmap(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

| 参数  | 含义 |
|:---------------| :-----|
|**new_keystroke**               | 字符串，将要使用的按键。|
|**old_keystroke**               | 字符串，将被替换的按键。|
|**domain_pattern**              | 正则表达式[可选]，表明只有当域名匹配时，该按键映射才会生效。|
|**new_annotation**              | 字符串[可选], 如果提供了就用作帮助描述，否则就用old_keystroke对应的帮助描述。|

### 删除一个按键映射

    unmap(keystroke, [domain_pattern])

    iunmap(keystroke, [domain_pattern])

    vunmap(keystroke, [domain_pattern])

| 参数  | 含义 |
|:---------------| :-----|
|**keystroke**                   | 字符串，将要删除的按键。|
|**domain_pattern**              | 正则表达式[可选]，表明只有当域名匹配时，该操作会生效。|

### 删除所有按键映射

    unmapAllExcept(keystrokes, [domain_pattern])

| 参数  | 含义 |
|:---------------| :-----|
|**keystrokes**                  | 字符串数组，将要删除的按键。|
|**domain_pattern**              | 正则表达式[可选]，表明只有当域名匹配时，该操作会生效。|

示例,

    unmapAllExcept(['f', '/', '?']);

### 在搜索栏里添加搜索别名

    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);

| 参数  | 含义 |
|:---------------| :-----|
|**alias**                                   | 一个以上字符，用作搜索别名。当你在搜索栏里输入它之后，再按空格键，会切换到对应的搜索引擎。|
|**prompt**                                  | 提示符，说明当前所用搜索引擎。|
|**search_url**                              | 搜索引擎搜索地址。|
|**suggestion_url[可选]**                    | 搜索自动完成URL，如果提供的话，搜索栏会列出相关关键字。|
|**callback_to_parse_suggestion[可选]**      | 解析suggestion_url返回的内容，列出相关关键字。|

    addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key);

| 参数  | 含义 |
|:---------------| :-----|
|**search_leader_key**                                   | 一个以上字符，如果你不想使用默认的`s`键。|
|**only_this_site_key**                                  | 一个以上字符，如果你不想使用默认的`o`键。|

这是一个扩展版本，除了往搜索栏里添加搜索别名，还会创建一个按键映射，由`search_leader_key`加上`alias`组成，对应的操作就是搜索选中文本。比如，下面这行，

    addSearchAliasX('s', 'stackoverflow', 'http://stackoverflow.com/search?q=', 'o');

就相当于

    addSearchAlias('s', 'stackoverflow', 'http://stackoverflow.com/search?q=');
    mapkey('os', 'Search Selected with stackoverflow', function() {
        searchSelectedWith("http://stackoverflow.com/search?q=");
    });
    vmapkey('os', 'Search Selected with stackoverflow', function() {
        searchSelectedWith("http://stackoverflow.com/search?q=");
    });

### 删除搜索别名及相关绑定

    removeSearchAliasX(alias, search_leader_key, only_this_site_key);

### 搜索栏辅助函数

    Omnibar.listWords(<array of words>)
    Omnibar.html(<any html snippets>)

### 修改内嵌vim编辑器里的按键

    aceVimMap(lhs, rhs, ctx)

例如，

    aceVimMap('jk', '<Esc>', 'insert');

### 属性设置列表

| 属性 | 默认值 | 解释 |
|:---------------|:-----|:-----|
| Hints.characters | "asdfgqwertzxcvb" | 可用于生成拨号盘的字符。 |
| Hints.numericHints | false | 是否使用数字生成拨号字符，如果打开，你可以输入英文字符过滤链接。|
| Hints.scrollKeys | "0jkhlG$" | 在拨号模式下可用于滚屏的按键，你通常不需要修改，除非你改了`Hints.characters`. |
| settings.showModeStatus | false | 是否在状态栏显示当前模式。 |
| settings.showProxyInStatusBar | false | 是否在状态栏显示代理信息。 |
| settings.richHintsForKeystroke | 500 | 超过指定毫秒数后显示按键提示，如果指定值等于0会禁用按键提示。 |
| settings.useLocalMarkdownAPI |  true | 是否使用[chjj/marked](https://github.com/chjj/marked)解析markdown，否则使用github API。 |
| settings.focusOnSaved | true | 是否在退出内嵌VIM编辑器后把光标定位到输入框。 |
| settings.omnibarMaxResults | 10 | 搜索栏下面每页显示多少条结果。 |
| settings.omnibarPosition | "middle" | 定义搜索框位置。 ["middle", "bottom"] |
| settings.omnibarSuggestionTimeout | 200 | 设置触发搜索引擎提示的超时，当按键过去设定毫秒后才发起搜索引擎提示的请求，这样避免每次按键就触发请求。|
| settings.focusFirstCandidate | false | 是否在搜索栏下面自动选择第一个匹配的结果。 |
| settings.tabsThreshold | 9 | 当打开标签页的数量超过设定值时，使用搜索栏来查找标签页。 |
| settings.hintsThreshold | 10000 | 当普通的可点击元素(a, button, select, input, textarea)数量超过设定值时，Surfingkeys就不会为其它可点击的元素显示拨号键了。 |
| settings.clickableSelector | "" | 自定义CSS selector用于f键选择无法检测到的可点击元素，例如"\*.jfk-button, \*.goog-flat-menu-button"。 |
| settings.clickablePat | /(https?&#124;thunder&#124;magnet):\/\/\S+/ig | 用于检测文字中可点击链接的正则表达式，你可以按`O`打开检测到的链接。|
| settings.smoothScroll | true | 是否启用顺滑滚动。 |
| settings.modeAfterYank | "" | 在可视模式下，在复制文本之后，回到哪种模式，["", "Caret", "Normal"]，默认是""，指保持当前模式。 |
| settings.scrollStepSize | 70 | `j`/`k`滚动时每一步的大小。 |
| settings.scrollFriction | 0 | 在滚动一步之后，开始连续滚动所需要的力。数字大，表示需要更大的力来启动连续滚动，这样在开始连续滚动时会有一个抖动，但也能保证第一步的滚动幅度是精确的。 |
| settings.nextLinkRegex | /((>>&#124;next)+)/i | 匹配下一页链接的正则表达式。 |
| settings.prevLinkRegex | /((<<&#124;prev(ious)?)+)/i| 匹配上一页链接的正则表达式。 |
| settings.hintAlign | "center" | 拨号键与它对应的目标如何对齐。["left", "center", "right"] |
| settings.defaultSearchEngine | "g" | 搜索栏里的默认搜索引擎。 |
| settings.blacklistPattern | undefined | 如果当前访问的网站匹配设定的正则表达式，则禁用Surfingkeys。 |
| settings.focusAfterClosed | "right" | 关掉当前标签页后，切换到哪一侧的标签页。["left", "right"] |
| settings.repeatThreshold | 99 | 操作可重复最多次数。 |
| settings.tabsMRUOrder | true | 查找打开标签页时，是否按最近访问顺序列出所有标签页。 |
| settings.historyMUOrder | true | 查找访问记录时，是否按最常访问顺序列出所有访问记录。 |
| settings.newTabPosition | 'default' | 在哪个位置创建新标签页。["left", "right", "first", "default"] |
| settings.interceptedErrors | [] | 指明Surfingkeys为哪些错误显示错误页，这样在这些错误页你依然可以使用Surfingkeys。例如，["*"]为所有错误显示错误页，["net::ERR_NAME_NOT_RESOLVED"]只为ERR_NAME_NOT_RESOLVED显示错误页。更多错误请参考[net_error_list.h](https://github.com/adobe/chromium/blob/master/net/base/net_error_list.h)。  |
| settings.startToShowEmoji | 2 | 在冒号后输入多少个字符才显示表情下拉选项。 |
| settings.language | undefined | 帮助中使用何种语言，目前只支持中英文，设为"zh-CN"显示中文帮助。 |
| settings.stealFocusOnLoad | true | 是否阻止光标定位到输入框，默认为true，这样我们可以在页面加载结束之后直接使用Surfingkeys提供的各类按键，否则需要按Esc退出输入框。 |
| settings.enableAutoFocus | true | 是否允许光标自动定位到动态显示的输入框里。这个设置和`stealFocusOnLoad`不同，那个只是在页面加载完成后跳出输入框。比如，有一个页面上有个隐藏的输入框，它只在用户点击某个链接后显示出来。如果你不想这个刚显示出来的输入框自动获得焦点，就可以把这个设置设为false。 |
| settings.theme | undefined | 修改Surfingkeys界面风格。 |
| settings.caseSensitive | false | 网页内搜索是否大小写敏感。 |
| settings.smartCase | true | 当搜索关键字里含有大写字符时，是否自动设为大小写敏感。 |
| settings.cursorAtEndOfInput | true | 是否在进入输入框时把光标放在结尾，为false时，光标将放在上次离开输入框时的位置。 |
| settings.digitForRepeat | true | 是否把数字输入当作重复次数，为false时，数字可作为普通按键。 |

### settings.theme示例，修改状态栏字体

    settings.theme = `
        #sk_status, #sk_find {
            font-size: 20pt;
        }
    }`;

## 编译

    npm install
    npm run build

    npm run build firefox # build webextension for firefox

## Credits

* [jQuery](https://github.com/jquery/jquery)
* [TRIE](https://github.com/mikedeboer/trie)
* [ACE vim editor](https://github.com/ajaxorg/ace)
* [markdown parser](https://github.com/chjj/marked)
* [pdf.js](https://github.com/mozilla/pdf.js)
* [vimium](https://github.com/philc/vimium)
* [cVim](https://github.com/1995eaton/chromium-vim)

## License

MIT License
