# Surfingkeys -- 用javascript和键盘扩展你的chrome

Surfingkeys和现有的一些插件，如[philc/vimium](https://github.com/philc/vimium)和[1995eaton/chromium-vim](https://github.com/1995eaton/chromium-vim)一样，让你尽可能的通过键盘来使用chrome浏览器，比如跳转网页，上下左右滚屏。但不只是给vim用户使用，Surfingkeys的基本特性是让你自己写一段Javascript脚本，然后通过`mapkey`映射到某些按键。之后当你按了那几个键以后，对应的Javascript脚本就会被执行。

我先是用了一年的vimium，大概半年前又切到了chromium-vim。之所以要自己重新造一个类似的轮子，是因为我发现要在这些插件里加上我自己的需求，需要改很多地方。比如，我就试图把下面这两个功能加入其中

* 用某种搜索引擎搜索选中的文本
* 双击某个单词获取中文翻译

Surfingkeys的配置全部写在一段javascript中，很容易添加自己的映射按键。如：

    mapkey('c-y', 'Show me the money', function() {
        alert('a well-known phrase uttered by characters in the 1996 film Jerry Maguire');
    });

[配置参考](#配置参考).

[演示](http://video.weibo.com/show?fid=1034:09ef299edbed112e9c0a66a18ffb3463)

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

* `u` 显示帮助
![help](https://cloud.githubusercontent.com/assets/288207/10328829/d3db179a-6ceb-11e5-8faf-73761584eeee.png)
* `b` 浏览/搜索收藏夹
![bookmark](https://cloud.githubusercontent.com/assets/288207/10328828/d3ac1fd0-6ceb-11e5-8e9c-7c0d35a195a1.png)
* `/` 在当前页查找
![find](https://cloud.githubusercontent.com/assets/288207/10328836/e4fa4960-6ceb-11e5-80bb-4339ef0db0c5.png)
* `f` 拨号打开链接
![follow](https://cloud.githubusercontent.com/assets/288207/10328833/e32d85a2-6ceb-11e5-8614-3f8a804cb2f2.png)
* `v` 切换文本选择模式
![visual](https://cloud.githubusercontent.com/assets/288207/10328835/e4df6c6c-6ceb-11e5-8ed7-17fd29070207.png)
* `<space>` 切换标签页
![tabs](https://cloud.githubusercontent.com/assets/288207/10328839/f0143ffe-6ceb-11e5-8eee-962db94b2c22.png)

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

`sg`里面的`g`是个别名，用于google，还有其他一些内置的别名，如`b`是百度的别名。这样当你按`sb`的时候就是使用百度来搜索选中文本。参考[在搜索栏里添加搜索别名](#在搜索栏里添加搜索别名)来添加你自己的搜索别名，尤其那些用于公司内部的搜索。

此外，还有`sog`可以使用google在本站搜索选中文本。在这个`sog`里面，`s`是search_leader_key，`o`是only_this_site_key，`g`是搜索别名。

## 类vim标示

简单说，vim中的marks就是按`m`，然后跟一个字符（0-9，A-Z，a-z），标示一下当前网址。之后，你随时按`'`跟上你定义的那个标示符，就会跳转到该网址。

除了`m`键创建标示外，你还可以从收藏夹里按住Ctrl，加上标示符来创建。如下：

1. 按下`b`打开收藏夹。
1. 随便输点啥，定位到你要标示的网址。
1. 按住Ctrl，加上你选中的标示符，比如`f`。

之后，按`'f`就可以直接打开该网址来。

这个功能对那些你需要经常访问对网址很有用，两个键直达。`om`可以查看你已创建的标示。

## 切换标签页

默认情况下，按空格会显示所有已打开标签页，然后按相应的提示键可以切到该标签页。

![tabs_overlay](https://cloud.githubusercontent.com/assets/288207/10544636/245447f6-7457-11e5-8372-62b8f6337158.png)

这里有个设置`settings.tabsThreshold`，当然打开的标签页总数超过它时，再按空格就会使用搜索栏来选择标签。

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

如果你希望一直用搜索栏来选择标签页，可使用如下设置:

    mapkey(' ', 'Choose a tab with omnibar', 'Normal.openOmnibar(OpenTabs)');

效果相当于：

    settings.tabsThreshold = 0;

## 配置参考

### 添加一个按键映射

    mapkey(keystroke, help_string, action_code, [expect_char], [domain_pattern])

| 参数  | 含义 |
|:---------------| :-----|
|**keystroke**                   | 字符串，触发某个操作的按键|
|**help_string**                 | 字符串，帮助描述，会自动出现在`u`打开的帮助小窗里。|
|**action_code**                 | 字符串或者函数，一段Javascript代码，或者一个Javascript函数。|
|**expect_char**                 | 布尔值[可选], 下一个按键是否为action_code的参数， 可以参考`m`或`'`的设置。|
|**domain_pattern**              | 正则表达式[可选], 表明只有当域名匹配时，该按键映射才会生效。比如，`/github\.com/i` 说明按键映射只在github.com上生效。|

一个示例，在不同网站上映射相同的按键到不同的操作：

    mapkey('zz', 'Choose a tab', 'Normal.chooseTab()', 0, /github\.com/i);
    mapkey('zz', 'Show usage', 'Normal.showUsage()', 0, /google\.com/i);

可视化模式下的mapkey

    vmapkey(keystroke, help_string, action_code, [expect_char], [domain_pattern])

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

### 添加一个迷你查询

迷你查询很像一个搜索引擎，不同的是，它把查询结果直接在小窗里显示出来，而不是打开一个新页。

    addMiniQuery(alias, prompt, search_url, callback_to_display_result);

## License

MIT License
