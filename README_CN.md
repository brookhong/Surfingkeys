# Surfingkeys -- 用javascript和键盘扩展你的chrome

Surfingkeys和现有的一些插件一样，让你尽可能的通过键盘来使用chrome浏览器，比如跳转网页，上下左右滚屏。但不只是给vim用户使用，Surfingkeys的基本特性是让你自己写一段Javascript脚本，然后通过`mapkey`映射到某些按键。之后当你按了那几个键以后，对应的Javascript脚本就会被执行。

Surfingkeys的配置全部写在一段javascript中，很容易添加自己的映射按键。如：

    mapkey('<Ctrl-y>', 'Show me the money', function() {
        Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

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

## 快速上手
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

### Insert mode

当输入焦点定位到各类输入框时（无论你是通过`i`或`f`选择定位还是鼠标点击定位的），就进入该模式。
通过函数`imapkey`添加的所有按键都只在这种模式下有用。

    `Ctrl - i` 打开vim编辑器。

### 查找

查找不是模式，但是它会让你自动进入visual mode. 按`/`打开查找栏，输入你要查找的文字，你会看到所有匹配的文字会被高亮。按回车完成查找，这时你会自动进入visual mode -- `Caret`。按`n`定位下一个，`N`定位前一个。

## 搜索栏

一些需要用户输入的功能通过搜索栏提供，比如

* 用`t`打开网页（从收藏夹或访问历史）
* 用`b`打开收藏夹
* 用`og`/`ob`等打开搜索引擎
* 用`:`打开命令模式

用`t`打开搜索栏时，

    `Ctrl - d` 可以从收藏夹或访问历史中删除选中项

用`b`打开搜索栏时，

    `Ctrl - <any letter>` 创建相应的类似vim的全局标示。

![search_engine](https://cloud.githubusercontent.com/assets/288207/17644214/759ef1d4-61b3-11e6-9bd9-70c38c8b80e0.gif)

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

    mapkey(' ', 'Choose a tab with omnibar', 'Front.openOmnibar(OpenTabs)');

效果相当于：

    settings.tabsThreshold = 0;

无论是否在搜索栏里，标签页都按最近使用的顺序列出。如果你希望按标签页原本的顺序列出，可以设置：

    settings.tabsMRUOrder = false;

## 命令

用`:`打开搜索栏可用于执行命令，命令执行结果会显示在搜索栏下方。可以添加你自己的命令如下：

    command('<command_name>', '<help message for this command>', function() {
        // to do
    });

例如，

    command('setProxyMode', 'setProxyMode <always|direct|byhost>', function(args) {
        // args is an array of arguments
        RUNTIME('updateProxy', {
            mode: args[0]
        });
        // return true to close Omnibar for Commands, false to keep Omnibar on
        return true;
    });

    // 映射不同的按键到该命令，但采用不同的参数。
    map('spa', ':setProxyMode always');
    map('spb', ':setProxyMode byhost');
    map('spd', ':setProxyMode direct');

除了命令，你还可以执行各类简单js代码。

![commands_in_omnibar](https://cloud.githubusercontent.com/assets/288207/11527801/fadee82c-991d-11e5-92e9-b054796a6a75.png)

## 顺滑滚动

所有可以滚动的对象都默认支持顺滑滚动，如下可以关掉顺滑特性：

    settings.smoothScroll = false;

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

再按一次`Alt-s`会从settings.blacklist中删除该站点。另外，`yj`可以把当前设置复制到系统剪贴板。

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

* setProxyMode, 设置代理模式，有三种模式：direct, byhost, always

        direct      Chrome不使用代理访问任何网站。
        byhost      Chrome只在访问你通过下面的命令添加的网站时使用代理。
        always      Chrome使用代理访问所有网站。

* addProxySite, removeProxySite, toggleProxySite, 管理你需要通过代理访问的网站，比如：

        addProxySite google.com,facebook.com,twitter.com

* proxyInfo, 列出你当前的代理设置，包括用以上命令设置的信息。

* `cp`, 切换当前站点的代理设置，即是否使用代理访问当前站点。

* `spa`, `:setProxyMode always`快捷键。

* `spb`, `:setProxyMode byhost`快捷键。

* `spd`, `:setProxyMode direct`快捷键。

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

    mapkey('e', '#2Scroll a page up', 'Normal.scroll("pageUp")', {repeatIgnore: true});

这样，`.`就不会往上翻页，即使你刚刚按了`e`。

## Markdown预览

1. 复制markdown代码到系统剪贴板。
1. `sm`预览剪贴板里的markdown。
1. 在预览页，再按`sm`会打开vim编辑器编辑markdown。
1. `:wp`刷新预览。
1. `r`可以从系统剪贴板里重新加载markdown.

![markdown](https://cloud.githubusercontent.com/assets/288207/17669897/0b6fbaf6-6342-11e6-8583-86eb8691190d.gif)

Surfingkeys默认使用[这个markdown分析器](https://github.com/chjj/marked)，如果你想用[github提供的API](https://developer.github.com/v3/markdown/)，可以设置：

    settings.useLocalMarkdownAPI = false;

## 配置参考

### 添加一个按键映射

    mapkey(keystroke, help_string, action_code, [options])

| 参数  | 含义 |
|:---------------| :-----|
|**keystroke**                   | 字符串，触发某个操作的按键|
|**help_string**                 | 字符串，帮助描述，会自动出现在`u`打开的帮助小窗里。|
|**action_code**                 | 字符串或者函数，一段Javascript代码，或者一个Javascript函数。|
|**options**                     | object, 字段属性如下 |
|**extra_chars**                 | 布尔值[可选]，下一个按键是否为action_code的参数， 可以参考`m`或`'`的设置。|
|**domain**                      | 正则表达式[可选]，表明只有当域名匹配时，该按键映射才会生效。比如，`/github\.com/i` 说明按键映射只在github.com上生效。|
|**repeatIgnore**                | 布尔值[可选]，是否可通过点命令重复该按键。|

一个示例，在不同网站上映射相同的按键到不同的操作：

    mapkey('zz', 'Choose a tab', 'Front.chooseTab()', {domain: /github\.com/i});
    mapkey('zz', 'Show usage', 'Front.showUsage()', {domain: /google\.com/i});

可视化模式下的mapkey

    vmapkey(keystroke, help_string, action_code, [options])

### 映射按键到其他按键

    map(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

| 参数  | 含义 |
|:---------------| :-----|
|**new_keystroke**               | 字符串，将要使用的按键。|
|**old_keystroke**               | 字符串，将被替换的按键。|
|**domain_pattern**              | 正则表达式[可选]，表明只有当域名匹配时，该按键映射才会生效。|
|**new_annotation**              | 字符串[可选], 如果提供了就用作帮助描述，否则就用old_keystroke对应的帮助描述。|

### 删除一个按键映射

    unmap(keystroke, [domain_pattern])

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
    mapkey('os', 'Search Selected with stackoverflow',  'searchSelectedWith("http://stackoverflow.com/search?q=")');
    vmapkey('os', 'Search Selected with stackoverflow',  'searchSelectedWith("http://stackoverflow.com/search?q=")');

### 搜索栏辅助函数

    Omnibar.listWords(<array of words>)
    Omnibar.html(<any html snippets>)

## 编译

    npm install
    ./node_modules/gulp/bin/gulp.js

## Credits

* [jQuery](https://github.com/jquery/jquery)
* [TRIE](https://github.com/mikedeboer/trie)
* [ACE vim editor](https://github.com/ajaxorg/ace)
* [markdown parser](https://github.com/chjj/marked)
* [vimium](https://github.com/philc/vimium)
* [cVim](https://github.com/1995eaton/chromium-vim)

## License

MIT License
