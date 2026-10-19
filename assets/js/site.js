/* ============================================================
   创想时代开发组 · 官网脚本
   - 站点配置（联系方式 / 表单接收地址）集中在 SITE_CONFIG
   - 公告数据集中在 ANNOUNCEMENTS
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     ① 站点配置  —— 只需要改这里的联系方式
     ========================================================== */
  var SITE_CONFIG = {
    // ★★★ 一审问卷（问卷星）★★★
    // 「加入我们」页第二步的按钮指向它；审核条例面板的「一审」行内链接也指向它。
    // 注意：问卷是一审才填的，初审在对外审核群内完成。
    surveyUrl: 'https://www.wjx.cn/vm/OtrfYCj.aspx',

    // ★★★ 三个 QQ 群 ★★★
    qqFeedback: '1017068586',   // 反馈交流群（资源问题反馈）
    qqAudit: '1045216325',      // 对外审核群（加入我们）
    qqPublic: '788233856',      // 对外交流群（交流探讨）
    qqCouncil: '1018260006',    // 开发理事会（对外代投）

    // 邮箱：暂时留空，「联系我们」页会自动隐藏邮箱那一行。
    // 想显示邮箱就填上，例如 'contact@innovaage.cn'
    email: '',

    // 其他平台（没有就留空，页面对应行会自动隐藏）
    // 带 url 的会渲染成可点链接，没 url 的只显示账号名
    neteaseMc: '创想时代开发组',       // 网易我的世界 团队开发者主账号
    neteaseHd: '创想时代工作室',       // 网易大神（认证账号）
    douyin: '创想时代开发组',          // 抖音账号名
    bilibiliName: '创想时代开发组',    // B 站账号名
    bilibili: 'https://space.bilibili.com/488348167',  // B 站主页链接
    discord: '',                       // Discord 邀请链接
    site: 'https://innovaage.cn',

    // ★★★ 首页大图 ★★★
    // 留空则首页只显示文字（不报错）。图片放在 assets/img/ 下面。
    heroImage: 'assets/img/shader-2.jpg',
    heroImageAlt: 'Log橡木SA 渲染效果：樱花林地里飘落的花瓣与透光树冠'
  };

  /* ==========================================================
     ③ 作品数据 —— 首页「作品展示」与作品页都用这份数据
     字段：img / title / meta / category / desc(可选)
     category 用下面 CATEGORIES 里的键，用于筛选
     ========================================================== */

  /* ==========================================================
     ④ 作品列表 —— 一个作品只占一项，点进去才是它的详情页
     字段：id / img(封面) / title / meta / category / desc
     ★ 一个作品只能有一条！同一作品的多张截图请写进下面 WORKS 里那一项的 shots，
       不要在这里重复列出（否则列表页会把同一个作品显示成好几个）。
     ========================================================== */
  var CATEGORIES = {
    shader: '光影',
    map: '地图',
    skin: '皮肤',
    tex: '材质',
    addon: 'Addon'
  };

  /* 首页首屏轮播用的图 —— 只挑宽度 ≥ 1400 的原图。
     首屏整幅铺满时，图会被拉到 2000px 上下，
     992 宽那种小截图拉两倍就发虚，所以这里单独列一份。 */
  var HERO_SLIDES = [
    { img: 'assets/img/shader-2.jpg', alt: 'LogSA 晴天：樱花树冠与草地花簇' },
    { img: 'assets/img/shader-1.jpg', alt: 'LogSA 晴天：雪山与松林的光影过渡' },
    { img: 'assets/img/shader-3.jpg', alt: 'LogSA 水面：峡谷水道的镜面反射' },
    { img: 'assets/img/fangzhen-shot-1.jpg', alt: '仿真工艺：室内场景，木地板与原木家具' },
    { img: 'assets/img/fangzhen-shot-3.jpg', alt: '仿真工艺：草方块地形的表面细节' },
    { img: 'assets/img/hero-works.jpg', alt: '雪原与松林俯瞰' }
  ];

  var SHOWCASE = [
    {
      id: 'enterprise-gray-ghost',
      img: 'assets/img/enterprise-gray-ghost.jpg',
      title: '企业-灰色幽灵',
      meta: '作者：创想时代 Mingxiang｜渲染：创想时代 柑柠',
      category: 'skin',
      desc: '付费皮肤，参考并较高水平地还原了游戏《碧蓝航线》的角色企业'
    },
    {
      id: 'log7-birch',
      img: 'assets/img/log7-1.jpg',
      title: 'Log7桦木 · 完整版',
      meta: '作者：创想时代 Log_坤',
      category: 'shader',
      desc: '付费光影：可触碰的体积云、体积光与丁达尔效应、水面实时反射'
    },
    {
      id: 'log-shader-sa',
      img: 'assets/img/shader-2.jpg',
      title: 'Log橡木SA',
      meta: '作者：Log坤',
      category: 'shader',
      desc: '基岩版光影，主打水面镜面反射与自然光过渡'
    },
    {
      id: 'qiushui-sanchi',
      img: 'assets/img/qiushui-1.jpg',
      title: '秋水三尺',
      meta: '作者：余末YuuMo',
      category: 'map',
      desc: '祈水，祈的是秋水三尺！'
    },
    {
      id: 'lingling-v5000-oak7',
      img: 'assets/img/lingling-1.jpg',
      title: '零雾构想V5000 · 橡木7画质提升包',
      meta: '作者：Log坤',
      category: 'addon',
      desc: '把零雾构想V5000 内置光影换成 Log 橡木7'
    },
    {
      id: 'lingling-universal',
      img: 'assets/img/lingling-u-1.jpg',
      title: '零雾构想通用版',
      meta: '作者：零雾〇5Fogg05、Windows、Log_坤',
      category: 'tex',
      desc: '零雾构想与 Log 白桦木再次联动，内置 V5003 与 Log 白桦木灵动视效包'
    },
    {
      id: 'bilibili-pvp-textures',
      img: 'assets/img/qingju-bilibili-pvp.jpg',
      title: 'Bilibili PVP Textures',
      meta: '作者：青橘',
      category: 'tex',
      desc: '取自作者早期作品 Bilibili UI 衍生而成的 PVP 材质，贴图与天空皆为原创'
    },
    {
      id: 'deer-pvp-textures',
      img: 'assets/img/qingju-deer-pvp.jpg',
      title: 'Deer PVP 材质',
      meta: '作者：青橘',
      category: 'tex',
      desc: '100% 原创的 PVP 材质，从方块到物品全部手绘，天空另外做了处理'
    }
  ];

  /* 系列作品专题页 —— 在官网上发布的作品，字段与 SHOWCASE 相同。
     作品页默认打开的就是这一栏。 */
  var SHOWCASE_HOME = [
    {
      id: 'uransch',
      href: 'work-rich.html?id=uransch',
      img: 'assets/img/uransch-cover.jpg',
      title: '无人区跑酷',
      en: 'URANSCH PARKOUR',
      meta: '作者：柑柠',
      category: 'map',
      desc: '箱庭式中高难度跑酷地图，从 2016 年做到现在，56 个关卡，基岩版与 Java 版同玩法'
    },
    {
      id: 'fangzhen-tech',
      href: 'work-rich.html?id=fangzhen-tech',
      img: 'assets/img/fangzhen-cover.jpg',
      title: '仿真工艺系列材质',
      en: 'REALCRAFT TEXTURE',
      meta: '作者：茫帛',
      category: 'tex',
      desc: '风格化写实、偏生存实用向的材质包，历时近四年制作，现有多种版本可选'
    },
    {
      id: 'mengsea',
      href: 'mengsea.html',
      img: 'assets/img/mengsea/cover.jpg',
      title: '梦海旅者',
      en: 'SEADREAM VOYAGER',
      meta: '作者：暴走苏打',
      category: 'map',
      desc: '幻境与现实交织的大型剧情向解密地图，《幻世编年史》系列第一部'
    },
    {
      id: 'city',
      href: 'city.html',
      img: 'assets/img/city/cover.jpg',
      title: '创想之都',
      en: 'CHUANGXIANG CITY',
      meta: '发起：苏打、柑柠',
      category: 'map',
      desc: '由创想时代开发组苏打与柑柠发起的一个建设 MC 城市地图的大型项目，正式开始建设于 2022 年 8 月'
    }
  ];

  /* 尚未正式发布的测试组件 —— 单独一栏，字段与 SHOWCASE 相同。
     ★ 测试组件不放 SHOWCASE，否则会混进首页与作品页的代表作品里。
     有要上测试的组件时往这个数组里加即可。 */
  var SHOWCASE_TEST = [
    {
      id: 'vulkan-rtx-jog',
      href: 'work-rich.html?id=vulkan-rtx-jog',
      img: 'assets/img/jog-1.jpg',
      title: 'Vulkan RTX-Jog光影',
      meta: '作者：创想时代 Log_坤',
      category: 'shader',
      desc: '基于Caustica0.1.1修改，改动有限'
    }
  ];

  /* ==========================================================
     ④ 作品详情 —— 代表作单独成页：work.html?id=xxx
     字段：
       name      作品名（与 SHOWCASE 里的 title 对应）
       author    作者
       type      类型文字，如「光影 / Shader」
       tagline   一句话定位，显示在标题下面
       cover     详情页头图
       facts     左侧信息栏，[{k,v}] 形式
       intro     正文段落数组
       shots     截图清单 [{img, caption}]
       notice    使用须知（可选）
     ★ 加新代表作：在这里加一项，id 用英文小写短横线，
       然后在 SHOWCASE 对应那条上填同名的 id，作品页就会出现「查看详情」入口。
     ========================================================== */
  var WORKS = {
    'vulkan-rtx-jog': {
      name: 'Vulkan RTX-Jog光影',
      displayEn: 'VULKAN RTX|JOG',
      author: '创想时代 Log_坤',
      type: '光影 / Shader',
      tagline: '基于Caustica0.1.1修改，改动有限',
      cover: 'assets/img/jog-1.jpg',
      coverAlt: 'Vulkan RTX-Jog光影',
      linksTop: true,
      facts: [
        { k: '作品名', v: 'Vulkan RTX-Jog光影' },
        { k: '作者', v: '创想时代 Log_坤' },
        { k: '类型', v: '光影 / Shader' },
        { k: '简介', v: '基于Caustica0.1.1修改，改动有限' },
        { k: 'Q 群下载', v: '980037287', bold: true }
      ],
      intro: [
        { heading: '简介' },
        '基于Caustica0.1.1修改，改动有限',
        { heading: '构建流程' },
        '自行构建 .jar 的流程详见「构建流程.txt」',
        { heading: '效果预览' },
        {
          imgs: [
            { img: 'assets/img/jog-2.jpg', alt: 'Vulkan RTX-Jog光影' },
            { img: 'assets/img/jog-3.jpg', alt: 'Vulkan RTX-Jog光影' },
            { img: 'assets/img/jog-4.jpg', alt: 'Vulkan RTX-Jog光影' },
            { img: 'assets/img/jog-5.jpg', alt: 'Vulkan RTX-Jog光影' },
            { img: 'assets/img/jog-6.jpg', alt: 'Vulkan RTX-Jog光影' },
            { img: 'assets/img/jog-7.jpg', alt: 'Vulkan RTX-Jog光影' }
          ]
        }
      ],
      links: [
        {
          solid: true,
          items: [
            { label: 'GitHub 仓库', href: 'https://github.com/Log-Kun/Caustica0.1.1_Jog.git' },
            { label: 'B 站视频', href: 'https://www.bilibili.com/video/BV1adYC68EX8' }
          ]
        }
      ]
    },
    'uransch': {
      name: '无人区跑酷',
      displayEn: 'URANSCH PARKOUR',
      author: '柑柠',
      type: '地图 / Map',
      tagline: '箱庭式中高难度跑酷地图，56 个关卡，基岩版与 Java 版同玩法',
      cover: 'assets/img/uransch-cover.jpg',
      coverAlt: '无人区跑酷海报：箱庭式跑酷地图的场景拼图',
      facts: [
        { k: '作品名', v: '无人区跑酷' },
        { k: '作者', v: '柑柠' },
        { k: '技术指导', v: '脸盆SaMa、Ender_Elaina' },
        { k: '类型', v: '地图 / 跑酷' },
        { k: '平台', v: 'Minecraft 基岩版 / Java 版 / 中国版' },
        { k: '版本', v: '基岩版 V14.FN（1.18.30+）／ Java 版 J2.0.1（1.18.2+）' },
        { k: '关卡数', v: '56 关（截至 V14）' },
        { k: '难度', v: '较难' },
        { k: '游玩时长', v: '2 小时以上，多人游玩最佳' },
        { k: '中国版名称', v: '【创想七周年】无人区跑酷V14' }
      ],
      intro: [
        '欢迎游玩无人区跑酷！这里是一款做了七年结果一点也不长的箱庭式跑酷地图！',
        '本地图是一个又臭又长的箱庭式跑酷。箱庭式，顾名思义，便是一个个小盒子内的跑酷。箱庭里有许多以群系、人造建筑或自然建筑为主题的跑酷，你可以在地图中体验到在森林间穿行、于雪山中辗转、在大厦间穿梭等等等内容。',
        '截止到 V14 版本，无人区跑酷已经拥有 56 个关卡。本地图拥有计时器以及暂停界面关卡数显示，在主线关卡通关后会依据您的通关用时而划分等级。',
        {
          imgs: [
            { img: 'assets/img/uransch-poster-2.jpg', alt: '无人区跑酷海报：第四章第十关 雪山' },
            { img: 'assets/img/uransch-poster-3.jpg', alt: '无人区跑酷海报：关卡场景' }
          ]
        },

        { heading: '前言' },
        '本地图分为 BE 版（基岩版）与 JE 版（Java 版）。后者为前者的移植，其功能与玩法、场景等两者均相同。版本号为 V 开头的地图系基岩版，版本号为 J 开头的地图系 Java 版。',
        {
          list: [
            '游玩人数：多人游玩最佳',
            '地图版本号：V14.FN',
            '难度：较难',
            '游玩时间：2 小时+（可能是练过一点跑酷的水平？）'
          ]
        },
        '本地图已在我的世界中国版、苦力怕论坛、我的世界中文论坛发布。本地图系列曾于多玩我的世界盒子多次被官方推荐同时广受好评，系列总下载量曾达到 15 万+。',
        '由于作者学业原因，本地图在两年内更新速度将会减缓。',

        { heading: '❗ 版本要求' },
        '最新版地图（V14.FN）基岩版支持版本：1.18.30（及以上）。最新版地图（J2.0.1）Java 版版本：1.18.2（及以上）。',
        '注意：Java 版 1.20 及以上版本无法在蜂蜜块边缘起跳，第一章第七关蜂巢依赖该机制，请不要使用 1.20 及以上版本游玩 Java 版无人区跑酷。',
        '该地图同时已发布至我的世界中国版，作品名称为【创想七周年】无人区跑酷V14。',

        { heading: '关卡难度总览' },
        '序章：★★☆☆☆☆',
        '第一章：森林 ★★★☆☆☆、沙漠 ★☆☆☆☆☆、冰山 ★★☆☆☆☆、诡异下界 ★★★★☆☆、蹦跳 ★★★★☆☆、山崖 ★★★☆☆☆、蜂巢 ★★★★☆☆',
        '第二章：海底 ★★☆☆☆☆、要塞 ★★★★☆☆、金库 ★★☆☆☆☆、书海 ★★★★☆☆、陶瓦山 ★★☆☆☆☆、羊毛 ★☆☆☆☆☆、沼泽 ★★☆☆☆☆、小城 ★★★☆☆☆、花园 ★★☆☆☆☆、神秘园 ★★☆☆☆☆、黑白 ★★☆☆☆☆、蘑菇 ★★☆☆☆☆',
        '第三章：末地 ★★☆☆☆☆、TNT ★★★☆☆☆、绯红下界 ★★★☆☆☆、陶瓦山二 ★★★★☆☆、矿脉 ★★☆☆☆☆、光 ★★★☆☆☆、小城废墟 ★★★★★★',
        '第四章：冰山二 ★★★☆☆☆、苔石要塞 ★★★☆☆☆、神庙 ★★★☆☆☆、石阵 ★★★★☆☆、镜像 ★★★☆☆☆、要塞二 ★★★★★☆、荒地下界 ★★★☆☆☆、末地二 ★★★☆☆☆、灵魂下界 ★★★☆☆☆、雪山 ★★★★★★、沙漠二 ★★★☆☆☆、海底二 ★★★☆☆☆、三角洲下界 ★★★★☆☆',
        '第五章：潮湿洞穴 ★★★☆☆☆、积雪针叶林 ★☆☆☆☆☆、水晶洞穴 ★★★☆☆☆、黑金矿洞 ★★★★☆☆、垂滴叶蹦蹦蹦 ★★★☆☆☆、工厂 ★★★★★★、活塞 ★★★★☆☆、大厦 ★★★★★★、黑石 ★★★★★★、沙滩 ★★★★★☆、密林 ★★★★★★、古堡 ★★★★★★',
        '节日关卡：中秋节 ★★★★☆☆、植树节 ★★★☆☆☆、春节 ★★★★★☆、圣诞节 ★★★★★☆',

        { heading: '通关等级' },
        '主线关卡通关后，按通关用时划分等级：',
        {
          list: [
            '1–3000 秒：S',
            '3000–5400 秒：A',
            '5400–7200 秒：B',
            '7200–9000 秒：C',
            '9000–10800 秒：D',
            '10800 秒及以上：跑酷带尸'
          ]
        },

        { heading: '历史' },
        '本地图始于 2016 年 12 月，刚开始时是想做一个群系跑酷，群系中只有玩家一人，故取名「无人区」，且当时有配套剧情。此时发布于多玩我的世界盒子。',
        '后续在第二章制作完成后，断更了一段时间。',
        '2018 年，该地图 V3.1 版本被 UP 主「薄海纸鱼」游玩并发布视频，但此 UP 主 2018 年游玩粉丝投稿地图相关的视频目前已被删除，故目前已无法找到当时的视频。',
        '2019 年，地图仍然保留着自己五六年级时低劣制作水平的痕迹，故作者气愤地将第一、第二章进行翻新后并增加了第三章部分关卡。此时便有了 V4；后续又开始更新第四章，有了 V5。',
        '2019 年末，当时已跨入初中，作者认为自己无法继续更新无人区跑酷系列，便想要永久停更该系列地图，后续便于多玩我的世界盒子中发布了 Alpha、Beta、Gamma、MAX、Maxplus、Max2plus 六个版本。后续作者反悔，开始以 V7 的版本号继续更新。以上四个版本后来重新命名为 V6.0（Alpha、Beta）、V6.1、V6.2、V6.3、V6.4。',
        '2020 年 3 月，无人区跑酷 V6.4 正式上架我的世界中国版。',
        '2020 年 6 月，无人区跑酷系列地图多数均申请了官方推荐并通过，至此便迎来无人区跑酷系列最顶峰的时期，下载总量达到 20 万有余。但不久之后，多玩我的世界盒子停服，无人区跑酷只能转移至中国版为阵地。',
        '2021 年 2 月，认为应当找一个地方持续更新无人区跑酷系列的国际版地图，便在 MCBBS 上发布了帖子并持续更新到 2023 年。',
        '注意，本历史不全，仅为重点内容。',

        { heading: '更新日志（V 版）' },
        '2024 年 3 月 1 日 V14.1：',
        {
          list: [
            '新增关卡 第五章第十关 沙滩 ★★★★★☆',
            '重置 第一章第一关森林，并将难度提升至 ★★★☆☆☆',
            '更改 第一章第四关诡异下界的路线与场景，难度提升至 ★★★★☆☆',
            '修复序章关卡告示牌错误的问题'
          ]
        },
        '2024 年 3 月 9 日 V14.FN.0：新增关卡 第五章第十一关 密林 ★★★★★★；新增关卡 第五章第十二关 古堡 ★★★★★★。',
        '2024 年 3 月 9 日 V14.FN.1：修复了关卡结尾结算缺失的问题。',
        '2024 年 3 月 12 日 V14.FN.2：补上了沙滩、密林、古堡关卡的暂停界面关卡数显示；修复密林关卡藤蔓缺失无法通关的问题。',

        { heading: '更新日志（J 版）' },
        '2024 年 3 月 15 日 J2.0.0：新增关卡 第五章第十关 沙滩、第五章第十一关 密林、第五章第十二关 古堡；重置 第一章第一关 森林、第一章第四关 诡异下界。',
        '2024 年 3 月 15 日 J2.0.0.1：修复第一章第一关缺少史莱姆块的问题。',
        '2024 年 3 月 15 日 J2.0.1：修复第一章第五关重生点缺失的问题。',

        {
          imgs: [
            { img: 'assets/img/uransch-shot-1.jpg', alt: '无人区跑酷截图：游戏内视角' },
            { img: 'assets/img/uransch-shot-2.jpg', alt: '无人区跑酷截图：游戏内视角' }
          ]
        },
        {
          imgs: [
            { img: 'assets/img/uransch-shot-3.jpg', alt: '无人区跑酷截图：游戏内视角' },
            { img: 'assets/img/uransch-shot-4.jpg', alt: '无人区跑酷截图：游戏内视角' }
          ]
        },
        {
          imgs: [
            { img: 'assets/img/uransch-shot-5.jpg', alt: '无人区跑酷截图：游戏内视角' },
            { img: 'assets/img/uransch-shot-6.jpg', alt: '无人区跑酷截图：游戏内视角' }
          ]
        },
        {
          imgs: [
            { img: 'assets/img/uransch-shot-7.jpg', alt: '无人区跑酷截图：游戏内视角' },
            { img: 'assets/img/uransch-shot-8.jpg', alt: '无人区跑酷截图：Java 版游戏内视角' }
          ]
        },

        { heading: '下载' },
        {
          links: [
            {
              solid: true,
              items: [
                { label: '百度网盘（提取码 5645）', href: 'https://pan.baidu.com/s/1sPVCbdoZAKqKuszGdI15JQ?pwd=5645' },
                { label: '蓝奏云（基岩版，密码 c9f0）', href: 'https://wwd.lanzoue.com/b03e0780d' },
                { label: '蓝奏云（Java 版，密码 3mqb）', href: 'https://wwd.lanzoue.com/b03fhs2ef' }
              ]
            }
          ]
        }
      ],
      linksTop: true,
      links: [
        {
          title: '发布与实况',
          solid: true,
          items: [
            { label: '苦力怕论坛发布帖', href: 'https://klpbbs.com/thread-131463-1-1.html' },
            { label: 'B 站 53 分钟全通关', href: 'https://www.bilibili.com/video/BV1124y1G7WR/' }
          ]
        },
        {
          title: '我的世界中国版',
          solid: true,
          items: [
            { label: '资源中心：无人区跑酷V14', href: 'https://resource-minecraft.h5.163.com/#/detail?id=4661952103696763810&channel=nearme_vivo' }
          ]
        },
        {
          title: '相关主页',
          solid: true,
          items: [
            { label: '作者 B 站空间', href: 'https://space.bilibili.com/308683128' },
            { label: '脸盆SaMa B 站空间', href: 'https://space.bilibili.com/383902456' },
            { label: 'Ender_Elaina B 站空间', href: 'https://space.bilibili.com/361433461' }
          ]
        }
      ]
    },
    'enterprise-gray-ghost': {
      name: '企业-灰色幽灵',
      author: '创想时代 Mingxiang',
      type: '皮肤 / Skin',
      tagline: '付费皮肤，参考并较高水平地还原了游戏《碧蓝航线》的角色企业',
      cover: 'assets/img/enterprise-gray-ghost.jpg',
      coverAlt: '企业-灰色幽灵皮肤渲染：白发兽耳、黑色制服与红色腰带，浅黄色背景',
      facts: [
        { k: '作品名', v: '企业-灰色幽灵' },
        { k: '作者', v: '创想时代 Mingxiang' },
        { k: '渲染', v: '创想时代 柑柠' },
        { k: '类型', v: '皮肤 / Skin' },
        { k: '价格', v: '付费皮肤' }
      ],
      intro: [
        '付费皮肤，参考并较高水平地还原了游戏《碧蓝航线》的角色企业。'
      ]
    },
    'log7-birch': {
      name: 'Log7桦木 · 完整版',
      author: '创想时代 Log_坤',
      type: '光影 / Shader',
      tagline: '付费光影：可触碰的体积云、体积光与丁达尔效应、水面实时反射周围景物',
      cover: 'assets/img/log7-1.jpg',
      coverAlt: '紫色花海与村庄：木栅栏、远处建筑与花丛的体积光',
      facts: [
        { k: '作品名', v: 'Log7桦木 · 完整版' },
        { k: '光影作者', v: '创想时代 Log_坤' },
        { k: '美术顾问', v: '犹疑月落' },
        { k: '类型', v: '光影 / Shader' },
        { k: '平台', v: 'Minecraft 基岩版' },
        { k: '价格', v: '300 钻石（付费作品）' },
        { k: '推荐配置', v: '骁龙 8 Gen1 / 天玑 9000 / A16，运行内存 6GB 以上' },
        { k: '性能', v: '12 区块、1080p 分辨率下可 60 帧' },
        { k: '反馈群', v: '1017068586' }
      ],
      intro: [
        { heading: '特性' },
        {
          list: [
            '可以触碰的体积云',
            '体积光与丁达尔效应',
            '水面实时反射周围景物',
            '屏幕空间阴影',
            '全分辨率'
          ]
        },
        { heading: '推荐配置' },
        '高通：骁龙 8 Gen1',
        '联发科：天玑 9000',
        '苹果：A16',
        '运行内存 6GB 以上（12 区块、1080p 分辨率可以 60 帧）'
      ],
      shots: [
        { img: 'assets/img/log7-1.jpg', alt: '紫色花海与村庄：木栅栏、远处建筑与花丛的体积光' },
        { img: 'assets/img/log7-2.jpg', alt: '浮岛树林：体积云与穿林光束、水面倒影' },
        { img: 'assets/img/log7-3.jpg', alt: '水面与树林：丁达尔光束穿过云层投下' }
      ]
    },
    'log-shader-sa': {
      name: 'Log橡木SA',
      author: '创想时代 Log坤',
      type: '光影 / Shader',
      tagline: 'Log 光影两周年特别版：方块卷云、氛围雨天、流动星辰、特调 ACES 色调映射',
      cover: 'assets/img/shader-rain.jpg',
      coverAlt: '雨天场景：石板路积水倒影、暖色窗光与雨幕',
      facts: [
        { k: '作品名', v: 'LogSA（Log Second Anniversary）' },
        { k: '作者', v: '创想时代 Log坤' },
        { k: '类型', v: '光影 / Shader' },
        { k: '平台', v: 'Minecraft 基岩版' },
        { k: '前置', v: 'SRC 光影（组件码 0559302）' },
        { k: '反馈群', v: '1017068586' },
        { k: 'Log 光影外群', v: '822955272' },
        { k: 'Log 光影内群', v: '980037287' }
      ],
      // 介绍就是一张成品海报，不再写文字段落
      poster: 'assets/img/logsa-poster.jpg',
      posterAlt: 'LogSA 组件介绍海报：总介绍、雨天 / 晴天 / 水面实机效果、开发作者与鸣谢',
      intro: [],
      shots: [
        // 截图只保留 alt（给屏幕阅读器与搜索引擎），不在页面上显示文字说明
        { img: 'assets/img/shader-rain.jpg', alt: '雨天场景：石板路面积水倒影、雨幕与暖色窗光' },
        { img: 'assets/img/shader-1.jpg', alt: '晴天场景：雪山与松林，天空过曝与积雪明暗过渡' },
        { img: 'assets/img/shader-3.jpg', alt: '水面场景：峡谷水道的镜面反射' },
        { img: 'assets/img/shader-2.jpg', alt: '林地场景：樱花树冠与草地花簇' }
      ],
      notice:
        '开发作者：创想时代 Log坤。' +
        '鸣谢：冷夜、被遗忘的青色剑士、关于本人、只问为何、老楚、范帛、柑柠、linlin 等人' +
        '的支持和帮助，同时也感谢各位玩家一直以来的陪伴与支持（排名不分先后）。',
      thanks: [
        { k: '开发作者', v: '创想时代 Log坤' },
        { k: '鸣谢', v: '冷夜、被遗忘的青色剑士、关于本人、只问为何、老楚、范帛、柑柠、linlin' },
        { k: '反馈途径', v: '创想时代反馈群 1017068586' }
      ]
    },

    'qiushui-sanchi': {
      name: '秋水三尺',
      author: '创想时代 余末YuuMo',
      type: '地图 / Map',
      tagline: '祈水，祈的是秋水三尺！',
      cover: 'assets/img/qiushui-1.jpg',
      coverAlt: '秋水三尺：夜色下的悬空宫殿正面全景',
      facts: [
        { k: '作品名', v: '秋水三尺' },
        { k: '作者', v: '创想时代 余末YuuMo' },
        { k: '类型', v: '地图 / Map' },
        { k: '平台', v: 'Minecraft 基岩版' }
      ],
      intro: [
        '祈水，祈的是秋水三尺！'
      ],
      shots: [
        { img: 'assets/img/qiushui-1.jpg', alt: '夜色下的悬空宫殿正面全景，金饰与发光题字' },
        { img: 'assets/img/qiushui-2.jpg', alt: '白天的悬空宫殿正面全景，蓝天与海面' },
        { img: 'assets/img/qiushui-3.jpg', alt: '侧面视角的悬空宫殿与金色环形结构，右上方竖排题字' }
      ]
    },

    'lingling-v5000-oak7': {
      name: '零雾构想V5000 · 橡木7画质提升包',
      author: 'Log坤',
      type: 'Addon / 画质提升包',
      tagline: '把零雾构想V5000 内置光影由「Log6 桦木」更换为 Log 橡木7',
      cover: 'assets/img/lingling-1.jpg',
      coverAlt: '画质提升包效果：光泽方块地面的日光反射',
      // 介绍就是这张成品海报，不再另写文字
      poster: 'assets/img/lingling-poster.webp',
      posterAlt: '零雾构想V5000-橡木7画质提升包 组件介绍海报',
      facts: [
        { k: '作品名', v: '零雾构想V5000-橡木7画质提升包' },
        { k: '作者', v: 'Log坤' },
        { k: '版本', v: 'V1.0（2026-10-13）' },
        { k: '类型', v: 'Addon / 画质提升包' },
        { k: '平台', v: 'Minecraft 基岩版' },
        { k: '需先购买', v: '零雾构想V5000 材质（组件码 8144171，付费四合一版本）' },
        { k: '同时加载', v: 'SRC 实时阴影（组件码 0559302）' },
        { k: '海报', v: '柑柠' }
      ],
      intro: [],
      shots: [
        { img: 'assets/img/lingling-1.jpg', alt: '效果图：光泽方块地面在日光下的反射与阴影' },
        { img: 'assets/img/lingling-2.jpg', alt: '效果图：方块方块堆叠场景的光照层次' },
        { img: 'assets/img/lingling-3.jpg', alt: '效果图：室内场景下的光照与材质表现' }
      ]
    },

    'lingling-universal': {
      name: '零雾构想通用版',
      author: '零雾〇5Fogg05、Windows、Log_坤',
      type: '材质 / Texture',
      tagline: '零雾构想与 Log 白桦木再次联动：零雾构想V5003 中内置了 Log 白桦木灵动视效图形包',
      cover: 'assets/img/lingling-u-1.jpg',
      coverAlt: '通用版效果：深色石墙在窗口日光下的 PBR 反射',
      // 介绍同样是成品海报
      poster: 'assets/img/lingling-universal-poster.webp',
      posterAlt: '零雾构想通用版 V2.3 组件介绍海报',
      facts: [
        { k: '作品名', v: '零雾构想通用版' },
        { k: '作者', v: '零雾〇5Fogg05、Windows、Log_坤' },
        { k: '版本', v: 'V2.3（2026-10-14）' },
        { k: '类型', v: '材质 / Texture' },
        { k: '平台', v: 'Minecraft 基岩版' },
        { k: '移植与维护', v: '创想时代开发组 Log坤团队（家属授权）' },
        { k: '内置', v: '零雾构想V5003 + Log 白桦木灵动视效' },
        { k: '获取', v: '中国版【创想时代开发组】账号免费发布' }
      ],
      intro: [],
      shots: [
        { img: 'assets/img/lingling-u-1.jpg', alt: '效果图：深色石墙与窗口日光，PBR 材质反射' },
        { img: 'assets/img/lingling-u-2.jpg', alt: '效果图：木质建筑与积雪场景的材质表现' },
        { img: 'assets/img/lingling-u-3.jpg', alt: '效果图：樱花林地，树冠与草地材质层次' }
      ]
    },

    'bilibili-pvp-textures': {
      name: 'Bilibili PVP Textures',
      author: '青橘',
      type: '材质 / Texture（PVP）',
      tagline: '取自作者早期作品 Bilibili UI 衍生而成的 PVP 材质',
      cover: 'assets/img/qingju-bilibili-pvp.jpg',
      coverAlt: 'Bilibili PVP Textures：粉色主题的角色、武器与物品栏',
      facts: [
        { k: '作品名', v: 'Bilibili PVP Textures' },
        { k: '作者', v: '青橘' },
        { k: '类型', v: '材质 / Texture（PVP）' }
      ],
      intro: [
        '贴图与天空皆为原创。'
      ],
      shots: [
        { img: 'assets/img/qingju-bilibili-pvp.jpg', alt: 'Bilibili PVP Textures：粉色主题的角色、武器、血条与物品栏' }
      ]
    },

    'deer-pvp-textures': {
      name: 'Deer PVP 材质',
      author: '青橘',
      type: '材质 / Texture（PVP）',
      tagline: '100% 原创的 PVP 材质，从方块到物品全部手绘',
      cover: 'assets/img/qingju-deer-pvp.jpg',
      coverAlt: 'Deer PVP 材质：青绿色主题的角色与武器',
      facts: [
        { k: '作品名', v: 'Deer PVP 材质' },
        { k: '作者', v: '青橘' },
        { k: '类型', v: '材质 / Texture（PVP）' }
      ],
      intro: [
        '从方块到物品全部手绘而成，天空部分另外做了处理。',
        '材质绘制以 PVP 使用为主，不太建议日常使用，用不惯者慎用。'
      ],
      shots: [
        { img: 'assets/img/qingju-deer-pvp.jpg', alt: 'Deer PVP 材质：青绿色主题的角色、武器与物品' }
      ]
    },
    'fangzhen-tech': {
      name: '仿真工艺系列材质',
      displayEn: 'REALCRAFT TEXTURE',
      author: '茫帛',
      type: '材质 / Texture',
      tagline: '风格化写实、偏生存实用向的材质包，历时近四年制作',
      cover: 'assets/img/fangzhen-cover.jpg',
      coverAlt: '仿真工艺系列材质封面：REALCRAFT 标志与草方块地形',
      facts: [
        { k: '作品名', v: '仿真工艺系列材质' },
        { k: '作者', v: '茫帛' },
        { k: '类型', v: '材质 / Texture' },
        { k: '平台', v: 'Minecraft 基岩版（网易中国版）/ Java 版' },
        { k: '网易版规格', v: '128x / 256x / 永久更新版 / 远古怀旧版' },
        { k: '方块贴图完成度', v: '80%' },
        { k: 'RVHD 网易版', v: '已下架' },
        { k: '联系 QQ', v: '112522280' }
      ],
      // 正文按作者给的说明排：图插在对应版本的位置，链接跟着图走
      intro: [
        '仿真工艺：一款风格化写实、偏生存实用向的材质包，历时近四年的制作，不断的优化、改进，目前有多种版本可供选择。',
        '繁茂草地拓展包需要 1.21.11 以上版本才能生效；Java 版最佳游玩版本为 1.21.11。目前方块贴图完成度为 80%。',

        { heading: '基岩版（网易中国版）' },
        {
          imgs: [
            { img: 'assets/img/fangzhen-shot-4.jpg', alt: '基岩版效果图：浅色方块面板近景' },
            { img: 'assets/img/fangzhen-shot-5.jpg', alt: '基岩版效果图：多种石材方块对照' },
            { img: 'assets/img/fangzhen-shot-6.jpg', alt: '基岩版效果图：蓝色石材方块近景' },
            { img: 'assets/img/fangzhen-shot-7.jpg', alt: '基岩版效果图：石材与矿石方块' }
          ]
        },
        {
          links: [
            {
              items: [
                { label: '四合一', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4689118647881567507&channel=netease' },
                { label: '普通版 128x', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4673766977794770501&channel=netease' },
                { label: '普通版 256x', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4673607031461400018&channel=netease' },
                { label: '永久更新版', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4659344896070953195&channel=netease' }
              ]
            },
            {
              title: '网易远古怀旧版（已停止维护）',
              items: [
                { label: '补丁包', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4661394903323224801&channel=netease' },
                { label: '256x 畅玩版', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4659341914317305302&channel=netease' },
                { label: '512x 测试版', href: 'https://resource-minecraft.h5.163.com/#/detail?uid=3073187643&id=4658767718024537686&channel=netease' }
              ]
            }
          ]
        },

        { heading: 'Java 版' },
        {
          imgs: [
            { img: 'assets/img/fangzhen-shot-1.jpg', alt: 'Java 版效果图：室内场景，木地板与原木家具' },
            { img: 'assets/img/fangzhen-shot-2.jpg', alt: 'Java 版效果图：草方块与各类矿石块' },
            { img: 'assets/img/fangzhen-shot-3.jpg', alt: 'Java 版效果图：草方块地形的表面细节' }
          ]
        },
        {
          links: [
            {
              items: [
                { label: '仿真工艺 JAVA 版（爱发电）', href: 'https://afdian.com/a/Mang2022823' }
              ]
            }
          ]
        },

        { heading: '仿真工艺衍生作品' },
        {
          imgs: [
            { img: 'assets/img/fangzhen-rvhd-1.jpg', alt: 'RVHD 效果图：石材与发光方块的接缝细节' },
            { img: 'assets/img/fangzhen-rvhd-2.jpg', alt: 'RVHD 效果图：原木与树叶在日光下的表面质感' },
            { img: 'assets/img/fangzhen-rvhd-3.jpg', alt: 'RVHD 效果图：深色石材与木材的拼接纹理' }
          ]
        },
        '仿真工艺衍生材质 RVHD —— 网易版已下架。',
        {
          links: [
            {
              items: [
                { label: 'RVHD JAVA 版（MineGraph）', href: 'https://www.minegraph.cn/resourcepacks/47' }
              ]
            }
          ]
        },

        {
          links: [
            {
              title: '作者主页',
              items: [
                { label: 'B 站空间', href: 'https://b23.tv/Qedjm9p' }
              ]
            }
          ]
        }
      ],
      // 图都插在正文对应位置了，不再单独列截图
      shots: []
    }
  };

  /* ==========================================================
     ② 公告数据 —— 公告页在这里增删改
     字段：id(英文短横线，详情页 article.html?id=) / date(YYYY-MM-DD) /
           title / color / tags[] / body(html) / pin(可选，置顶)
     列表只显示标题和一小段摘要，点进 article.html?id=xxx 才看全文。
     ★ 新增公告记得给 id，且要唯一。
     ========================================================== */
  var ANNOUNCEMENTS = [
    {
      id: 'subdomain-open',
      date: '2026-10-17',
      title: 'innovaage.cn 二级域名对全体成员开放',
      color: 'diamond',
      tags: ['站点'],
      body:
        '全新官网 innovaage.cn 正在持续准备中，具体完工可访问时间未确定。\n\n' +
        '为扩大域名的使用范围，现对创想时代全体成员**免费开放二级域名**。' +
        '二级域名由申请人自行决定，**只能用字母**；不带二级域名的 innovaage.cn 保留给官网使用。\n\n' +
        '**申请方式：**到首席开发官处申请，需要说明三件事——\n\n' +
        '- 想要的二级域名，即 \`xxx.innovaage.cn\` 里的 xxx\n' +
        '- 具体用途\n' +
        '- 需要解析到的地方（即这个域名要用在哪里）\n\n' +
        '**例子：**小明要开一个《我的世界》服务器，但这台服务器只有一个公网 IP：\`xx.xxx.xx.xxx\`。' +
        '他申请二级域名 \`xiaoming\` 后，把 \`xiaoming.innovaage.cn\` 解析到该 IP，这个域名就能直接当服务器地址用。\n\n' +
        '二级域名的使用**不限量，也不收费**。'
    },
    {
      id: 'invest-and-audit-rules',
      date: '2026-10-17',
      title: '开放代投业务，同步公布入室审核条例',
      color: 'green',
      pin: true,
      tags: ['招募', '代投', '里程碑'],
      body:
        '两件事一起说。\n\n' +
        '## 一、开放代投业务\n\n' +
        '依托我们庞大的粉丝群体与流量优势，你的作品上架资源中心，能够拿到更高曝光，获得更多玩家浏览下载。' +
        '接收地图、皮肤、材质、光影、功能玩法优质组件，免费 / 付费作品均可投递。\n\n' +
        '- **优势：**粉丝基数大，自带流量加持，助力你的作品被更多玩家看见。\n' +
        '- **转载非原创作品需原作者授权**，否则无法代投（例如从网站上随意下载的皮肤）。\n' +
        '- 所投组件必须遵守《创想时代开发组投稿条例》。\n' +
        '- 结算规则见群内公告的《创想时代开发组收益结算细则》。\n' +
        '- 以上文件均可在《创想时代开发组投稿问卷》中查阅，加入开发理事会即可详细了解并投递稿件。\n\n' +
        '代投请加**创想时代开发理事会群：1018260006**。详见 [代投与投稿](join.html#panel-invest)。\n\n' +
        '## 二、入室审核条例已公布\n\n' +
        '如需审核加入我室，请按照 [《创想时代开发组入室审核条例》](https://docs.qq.com/doc/DUEhwRVVmaE1ESUts) ' +
        '中所述流程进行审核，条例中同时也有各部门的介绍。\n\n' +
        '> 注意：阅读理解能力也算做基本素质的一部分，因此需要您**自行阅读条例**；若有疑问请询问群内管理员。\n\n' +
        '流程概要：**初审 → 一审 → 二审**。其中**初审在对外审核群（1045216325）内进行**，' +
        '初审通过后再到官网填写 [一审问卷](join.html#panel-rules)。'
    },
    {
      id: 'site-launch',
      date: '2026-10-16',
      title: '里程碑：创想时代开发组官网开放！',
      color: 'gold',
      tags: ['站点', '里程碑'],
      body:
        '创想时代官网现已启用！\n\n' +
        '各位可以在官网访问：\n\n' +
        '- 系列作品的发布页\n' +
        '- 代表作品的介绍页\n' +
        '- 测试中组件的参与页\n' +
        '- 官网内置的「工具箱」\n\n' +
        '在「工具箱」里可以使用本地运行的图片压缩、图片格式转换、各种格式的文件转换、' +
        '视频鉴定并转换为符合投稿标准的视频，以及由创想时代成员制作的工具。\n\n' +
        '官网内容目前还不完善，正在持续优化中……'
    },
    {
      id: 'module-50m-milestone',
      date: '2026-07-27',
      title: '模组总销量突破 5000 万',
      color: 'redstone',
      tags: ['里程碑'],
      body:
        '![数据海报：创想时代开发组旗下《我的世界》中国版模组总销量突破 5000 万](assets/img/milestone-50m.jpg)\n\n' +
        '2026 年 7 月 27 日，创想时代开发组旗下《我的世界》中国版主开发者账号发布的模组总销量' +
        '（即总下载量）突破 **5000 万次**，标志着创想一个新的里程碑。'
    }
  ];

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg) {
    var el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      el.style.cssText =
        'position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);z-index:200;' +
        'padding:11px 20px;border-radius:4px;font-size:14px;font-weight:700;' +
        'background:#212936;border:1px solid #3b4757;color:#e8eef6;' +
        'box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;pointer-events:none;' +
        'transition:opacity .2s ease,transform .2s ease;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,0)';
    });
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,20px)';
    }, 1800);
  }

  /* ---------- 当前页高亮 ----------
     桌面导航与手机侧栏都要高亮，所以两处一起扫。 */
  function markActiveNav() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    $$('.nav a, .mnav-links a').forEach(function (a) {
      if (a.getAttribute('data-nav') === page) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------- 年份 ---------- */
  function fillYear() {
    var y = String(new Date().getFullYear());
    $$('[data-year]').forEach(function (el) { el.textContent = y; });
  }

  /* ---------- 提交联系方式到页面 ----------
     页面上用 data-fill="xxx" 标记要填的位置，这里把配置里的真实值填进去。
     值为空的项：联系方式整行自动隐藏，不会在页面上留下空行或「待填写」。 */
  var FILL_KEYS = {
    qqFeedback: 'qqFeedback',
    qqAudit: 'qqAudit',
    qqPublic: 'qqPublic',
    qqCouncil: 'qqCouncil',
    email: 'email',
    neteaseMc: 'neteaseMc',
    neteaseHd: 'neteaseHd',
    douyin: 'douyin',
    bilibili: 'bilibili',          // 主页网址，给 data-fill-href 用
    bilibiliName: 'bilibiliName',  // 账号名，给 data-fill 用
    discord: 'discord',
    site: 'site'
  };

  function applyConfigToDom() {
    function valueOf(fillName) {
      return SITE_CONFIG[FILL_KEYS[fillName] || fillName];
    }

    // 先算出所有带链接的元素该指向哪，供下面的文字填充复用。
    // 顺序很重要：同一个元素可能同时有 data-fill（要显示的文字）
    // 和 data-fill-href（要跳转的链接），必须先决定链接再决定文字，
    // 否则文字会被另一套取值覆盖成「待填写」。
    var hrefValues = {};
    $$('[data-fill-href]').forEach(function (el) {
      var name = el.getAttribute('data-fill-href');
      var val = valueOf(name);
      hrefValues[name] = val || '';

      if (val) {
        el.setAttribute('href', name === 'email' ? 'mailto:' + val : val);
        // 站外链接一律新窗口打开，别把访客从站点带走
        if (name !== 'email') {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
        }
      } else {
        var row = el.closest('li') || el.closest('.contact-item') || el.parentElement;
        if (row) row.hidden = true;
      }
    });

    // 1) 填文字。
    //    文字一律以 data-fill 为准（它就是要显示的那句话）；
    //    data-fill-href 只管跳转地址。两者可以指向不同键，
    //    例如 B 站：显示 bilibiliName（账号名），链接用 bilibili（主页网址）。
    $$('[data-fill]').forEach(function (el) {
      el.textContent = valueOf(el.getAttribute('data-fill')) || '待填写';
    });

    // 2) 值为空的联系方式：整行隐藏（含里面的复制按钮）。
    //    判断「空不空」时，显示文字和链接地址任一有值就算不空。
    $$('[data-fill]').forEach(function (el) {
      var hrefName = el.getAttribute('data-fill-href');
      var hasText = !!valueOf(el.getAttribute('data-fill'));
      var hasLink = hrefName ? !!hrefValues[hrefName] : false;
      var row = el.closest('.contact-item') || el.closest('[data-row]');
      if (row && !hasText && !hasLink) row.hidden = true;
    });

    // 3) 长网址降一档字号，避免在窄栏里断成好几行
    $$('.contact-item .info b').forEach(function (b) {
      var t = b.textContent.trim();
      if (t.length > 26 && /^[\w.:/-]+$/.test(t)) b.classList.add('is-long');
    });
  }

  /* ---------- 一审问卷入口（问卷星） ----------
     两处共用同一个链接：
       #survey-link        报名加入面板的按钮
       #survey-link-rules  审核条例面板「一审」那一步的行内链接
     链接填了 → 两处都可点；没填 → 按钮变灰给备用方案，行内链接降级成普通文字。 */
  function initSurvey() {
    var link = $('#survey-link');
    if (!link) return;

    var url = SITE_CONFIG.surveyUrl;
    var inline = $('#survey-link-rules');

    if (url) {
      link.setAttribute('href', url);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      var note = $('#survey-note');
      if (note) note.textContent = '问卷在新窗口打开（问卷星）。';

      if (inline) {
        inline.setAttribute('href', url);
        inline.setAttribute('target', '_blank');
        inline.setAttribute('rel', 'noopener');
      }
      return;
    }

    // 没填链接：按钮变灰，并给出备用方式
    link.setAttribute('href', '#panel-contact');
    link.classList.add('is-disabled');
    link.setAttribute('aria-disabled', 'true');
    var warn = $('#survey-fallback');
    if (warn) warn.hidden = false;

    // 行内链接降级成普通文字，避免死链
    if (inline) {
      var span = document.createElement('b');
      span.textContent = '一审问卷';
      inline.parentNode.replaceChild(span, inline);
    }
  }

  /* ---------- 公告渲染 ---------- */
  var _notices = [];   // 已排序的全部公告

  /* 从公告正文里挑出图片地址（Markdown 写法 `![说明](路径)`）。
     只取本地图片，外站图片不往首页塞。 */
  function imagesOf(n) {
    var srcs = [];
    var re = /!\[[^\]]*\]\(\s*([^)\s]+)/g;
    var m;
    while ((m = re.exec(String(n.body || ''))) !== null) {
      var url = m[1];
      if (/^https?:/i.test(url)) continue;
      if (srcs.indexOf(url) < 0) srcs.push(url);
    }
    return srcs;
  }

  function paintNotices(host, list) {
    if (!list.length) {
      host.innerHTML = '<p style="color:#9aa8bb">暂时没有符合条件的公告。</p>';
      return;
    }

    host.innerHTML = list.map(function (n) {
      var d = String(n.date || '').split('-');
      var tags = (n.tags || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');

      // 日期块：只有「年-月-日」完整时才拆成「月 / 日 + 年份」，否则原样显示
      var dateBlock = d.length === 3 && d[0] && d[1] && d[2]
        ? '<b>' + esc(d[1]) + ' / ' + esc(d[2]) + '</b>' + esc(d[0])
        : '<b>' + esc(n.date || '') + '</b>';

      var href = n.id ? 'article.html?id=' + encodeURIComponent(n.id) : '';
      var excerpt = excerptOf(n, 96);

      // 正文里有图的，左边多一块图位，会轮播正文中的图片
      var imgs = imagesOf(n);
      var media = imgs.length
        ? '<div class="notice-media" data-imgs="' + esc(JSON.stringify(imgs)) + '" data-index="0">' +
            '<img src="' + esc(imgs[0]) + '" alt="" loading="lazy" decoding="async">' +
          '</div>'
        : '';

      // 列表只给标题 + 一小段正文，全文在 article.html 里
      return '' +
        '<article class="notice notice--' + esc(n.color || 'green') + (media ? ' has-media' : '') + '">' +
          '<div class="notice-date">' + dateBlock + '</div>' +
          media +
          '<div class="notice-body">' +
            '<h3>' +
              (href
                ? '<a href="' + esc(href) + '">' + esc(n.title || '') + '</a>'
                : esc(n.title || '')) +
              (n.pin ? ' <span class="tag tag--redstone">置顶</span>' : '') +
            '</h3>' +
            (excerpt ? '<p class="notice-excerpt">' + esc(excerpt) + '</p>' : '') +
            '<div class="notice-meta">' + tags +
              (href ? '<a class="notice-more" href="' + esc(href) + '">阅读全文 →</a>' : '') +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');

    startNoticeMedia();
  }

  /* 公告卡片上的图会轮播正文里的多张图。
     每张卡片错开起跑，别让一屏的图同时跳；
     标签页在后台时不动，系统开了「减少动态效果」也不动。 */
  var noticeMediaTimers = [];

  function startNoticeMedia() {
    noticeMediaTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    noticeMediaTimers = [];

    var boxes = $$('.notice-media[data-imgs]');
    if (!boxes.length) return;

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    boxes.forEach(function (box, i) {
      var list;
      try { list = JSON.parse(box.getAttribute('data-imgs') || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list) || list.length < 2 || reduce) return;

      var img = box.querySelector('img');
      if (!img) return;

      var idx = 0;
      var tick = function () {
        if (document.hidden) return;
        idx = (idx + 1) % list.length;
        img.style.opacity = '0';
        setTimeout(function () {
          img.src = list[idx];
          img.style.opacity = '1';
        }, 240);
      };

      // 错开起跑，第 1 张先多看一会儿
      var delay = 2600 + i * 850;
      var t = setTimeout(function () {
        tick();
        var iv = setInterval(tick, 3400);
        noticeMediaTimers.push(iv);
      }, delay);
      noticeMediaTimers.push(t);
    });
  }

  /* 去掉标签、压平空白，拿来做摘要。
     列表项之间用顿号连起来，别挤成一句读不通的话。 */
  function plainText(html) {
    return String(html || '')
      .replace(/<\/li>\s*<li[^>]*>/gi, '、')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*、\s*/g, '、')
      .trim();
  }

  /* ---------- 公告正文：Markdown → 干净的 HTML ----------
     正文用 Markdown 写（README 4.1 有教程）。
     转出来的 HTML 一律过一遍 DOMPurify，避免有人往正文里塞脚本。
     站外链接自动补 target/rel，保持新窗口打开。
     库没加载出来时退回「按空行分段 + 转义」，至少不会白屏。 */
  function renderMarkdown(src) {
    var text = String(src == null ? '' : src);
    if (!text.trim()) return '';

    var html;
    if (window.marked && typeof window.marked.parse === 'function') {
      html = window.marked.parse(text);
    } else {
      html = text.split(/\n{2,}/).map(function (p) {
        return '<p>' + esc(p) + '</p>';
      }).join('');
    }

    // 站外链接补上新窗口打开
    html = html.replace(
      /<a href="(https?:\/\/[^"]+)"/g,
      '<a href="$1" target="_blank" rel="noopener"'
    );

    if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      html = window.DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
    }
    return html;
  }

  function excerptOf(n, max) {
    var t = n.summary ? String(n.summary) : plainText(renderMarkdown(n.body));
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  /* ---------- 公告详情页 ----------
     地址形如 article.html?id=invest-and-audit-rules
     正文、日期、标签都在 ANNOUNCEMENTS 里，这里只负责挑出对应那一条。 */
  function initArticle() {
    var host = $('#article-detail');
    if (!host) return;

    var id = '';
    try {
      id = new URLSearchParams(location.search).get('id') || '';
    } catch (e) {
      var m = /[?&]id=([^&]+)/.exec(location.search);
      id = m ? decodeURIComponent(m[1]) : '';
    }

    var n = null;
    for (var i = 0; i < ANNOUNCEMENTS.length; i++) {
      if (ANNOUNCEMENTS[i].id === id) { n = ANNOUNCEMENTS[i]; break; }
    }

    var nameEl = $('#article-name');
    var metaEl = $('#article-meta');

    if (!n) {
      host.setAttribute('data-article-id', 'missing');
      if (nameEl) nameEl.textContent = '没找到这篇公告';
      if (metaEl) metaEl.innerHTML = '';
      host.innerHTML = '<div class="panel"><p style="margin:0;color:var(--text-dim)">' +
        '编号 <code>' + esc(id || '(空)') + '</code> 对应的公告不存在，可能已经被替换或删除了。' +
        '</p></div>';
      return;
    }

    host.setAttribute('data-article-id', n.id);
    document.title = n.title + ' | 创想时代开发组';

    if (nameEl) nameEl.textContent = n.title;

    var d = String(n.date || '').split('-');
    var dateText = (d.length === 3 && d[0] && d[1] && d[2])
      ? (Number(d[0]) + ' 年 ' + Number(d[1]) + ' 月 ' + Number(d[2]) + ' 日')
      : (n.date || '');

    if (metaEl) {
      metaEl.innerHTML =
        '<span class="article-date">' + esc(dateText) + '</span>' +
        (n.pin ? '<span class="tag tag--redstone">置顶</span>' : '') +
        (n.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
        '<button class="share-btn" type="button" data-share="' + esc(n.id) + '">' +
          '<span aria-hidden="true">↗</span> 分享这篇' +
        '</button>';
    }

    // 「上一条 / 下一条」按列表顺序走，看完一条能接着看
    var order = sortedNotices();
    var pos = -1;
    for (var k = 0; k < order.length; k++) {
      if (order[k].id === n.id) { pos = k; break; }
    }
    var newer = pos > 0 ? order[pos - 1] : null;
    var older = (pos >= 0 && pos < order.length - 1) ? order[pos + 1] : null;

    var navHtml = '';
    if (newer || older) {
      navHtml = '<nav class="article-nav" aria-label="更多公告">' +
        (newer
          ? '<a class="article-nav__item" href="article.html?id=' + esc(encodeURIComponent(newer.id)) + '">' +
              '<span class="article-nav__dir">← 上一条</span>' +
              '<b>' + esc(newer.title) + '</b></a>'
          : '<span class="article-nav__item is-empty"></span>') +
        (older
          ? '<a class="article-nav__item article-nav__item--next" href="article.html?id=' + esc(encodeURIComponent(older.id)) + '">' +
              '<span class="article-nav__dir">下一条 →</span>' +
              '<b>' + esc(older.title) + '</b></a>'
          : '<span class="article-nav__item is-empty"></span>') +
        '</nav>';
    }

    host.innerHTML = '<div class="article-body">' + renderMarkdown(n.body) + '</div>' + navHtml;
  }

  /* 公告的统一排序：置顶优先，其余按日期从新到旧。
     列表页和详情页的「上一条 / 下一条」都用这一份顺序。 */
  function sortedNotices() {
    return ANNOUNCEMENTS.slice().sort(function (a, b) {
      if (!!b.pin !== !!a.pin) return b.pin ? 1 : -1;
      return String(b.date).localeCompare(String(a.date));
    });
  }

  function renderAnnouncements() {
    var host = $('#notice-list');
    if (!host) return;

    _notices = sortedNotices();

    var filter = host.getAttribute('data-filter') || '';
    var list = filter
      ? _notices.filter(function (n) { return (n.tags || []).indexOf(filter) >= 0; })
      : _notices.slice();

    var limit = parseInt(host.getAttribute('data-limit'), 10);
    if (limit > 0) list = list.slice(0, limit);

    paintNotices(host, list);
  }

  /* ---------- 公告分类筛选 ---------- */
  function initNoticeFilter() {
    var box = $('#notice-filter');
    var host = $('#notice-list');
    if (!box || !host) return;

    var btns = $$('button[data-filter]', box);
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        var tag = btn.getAttribute('data-filter') || '';
        paintNotices(host, tag
          ? _notices.filter(function (n) { return (n.tags || []).indexOf(tag) >= 0; })
          : _notices.slice());
      });
    });
  }

  /* ---------- 复制按钮 ---------- */
  function initCopy() {
    $$('.copy-btn').forEach(function (btn) {
      // 复制内容有两种来源：
      //   1) data-copy-target：取 SITE_CONFIG 里的值（群号、邮箱、仓库地址）
      //   2) 没写 target 的：直接复制同一行里显示出来的那串文字
      var key = btn.getAttribute('data-copy-target');

      var literal = btn.getAttribute('data-copy');

      function value() {
        if (literal) return literal;
        if (key) return SITE_CONFIG[key] || '';
        var row = btn.closest('.contact-item');
        var shown = row && row.querySelector('.info b');
        return shown ? shown.textContent.trim() : '';
      }

      btn.addEventListener('click', function () {
        var val = value();
        if (!val || val === '待填写') { toast('这项联系方式还没填写'); return; }

        var done = function () {
          var old = btn.textContent;
          btn.textContent = '已复制';
          btn.classList.add('is-done');
          toast('已复制到剪贴板');
          setTimeout(function () {
            btn.textContent = old;
            btn.classList.remove('is-done');
          }, 1500);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(val).then(done, function () { fallbackCopy(val, done); });
        } else {
          fallbackCopy(val, done);
        }
      });
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { toast('复制失败，请手动选择文本'); }
    document.body.removeChild(ta);
  }

  /* ---------- 分享 ----------
     手机上有系统分享就用系统的；没有就把链接复制到剪贴板。
     用事件委托，详情页里后加出来的按钮也管用。 */
  function copyLink(url, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url, done); });
    } else {
      fallbackCopy(url, done);
    }
  }

  function shareThis() {
    var url = location.href;
    var title = (document.title || '').replace(/\s*\|.*$/, '');
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () {});
      return;
    }
    copyLink(url, function () { toast('链接已复制，可以发给别人了'); });
  }

  function initShare() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-share]') : null;
      if (!btn) return;
      e.preventDefault();
      shareThis();
    });
  }

  /* ---------- 标签切换 ---------- */
  function initTabs() {
    // 按 .tabs 分组处理：一个页面里可以有外层标签（MC 作品 / 其他作品）
    // 和内层标签（海报 / 设计 / 渲染），互不干扰。
    // 只处理真正切换面板的标签；标签行里指向别的页面的链接（如「专题页」）没有 aria-controls。
    $$('.tabs').forEach(function (group) {
      var tabs = Array.prototype.slice.call(group.querySelectorAll('.tab')).filter(function (t) {
        return t.getAttribute('aria-controls');
      });
      if (!tabs.length) return;

      var panels = tabs.map(function (t) {
        return $('#' + t.getAttribute('aria-controls'));
      }).filter(Boolean);

      function activate(tab, scroll) {
        var id = tab.getAttribute('aria-controls');

        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        panels.forEach(function (p) {
          p.hidden = p.id !== id;
        });

        // 内层标签：把外层包着它的面板也打开，否则点进来还是空的
        var node = panels.filter(function (p) { return p.id === id; })[0];
        node = node ? node.parentElement : null;
        while (node) {
          if (node.classList && node.classList.contains('tab-panel') && node.hidden) {
            node.hidden = false;
            var ctrl = document.querySelector('.tab[aria-controls="' + node.id + '"]');
            if (ctrl) {
              ctrl.classList.add('is-active');
              ctrl.setAttribute('aria-selected', 'true');
              // 外层同组的其它面板一并收起，避免同时露出两块
              var ctrlGroup = ctrl.closest ? ctrl.closest('.tabs') : null;
              if (ctrlGroup) {
                Array.prototype.forEach.call(ctrlGroup.querySelectorAll('.tab[aria-controls]'), function (t) {
                  if (t === ctrl) return;
                  t.classList.remove('is-active');
                  t.setAttribute('aria-selected', 'false');
                  var tp = document.getElementById(t.getAttribute('aria-controls'));
                  if (tp) tp.hidden = true;
                });
              }
            }
          }
          node = node.parentElement;
        }

        if (history.replaceState) history.replaceState(null, '', '#' + id);

        if (scroll) {
          var y = group.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { activate(tab, true); });
      });

      var hash = (location.hash || '').replace('#', '');
      if (hash) {
        var target = tabs.filter(function (t) {
          return t.getAttribute('aria-controls') === hash;
        })[0];
        // 标记里已经带 is-active 的标签也要跑一次：内层标签靠这一步顺带打开外层
        if (target) activate(target, false);
      }
    });
  }

  /* ---------- 深浅主题切换 ----------
     默认浅色（终末地风格）。没手动选过就跟随系统；选过就记住，刷新与换页都不变。
     页面 <head> 里另有一段同样逻辑的内联脚本，负责在渲染前先定主题、避免闪一下。 */
  var THEME_KEY = 'ia-theme';

  function systemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function savedTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return (t === 'light' || t === 'dark') ? t : '';
    } catch (e) { return ''; }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || savedTheme() || systemTheme();
  }

  function applyTheme(theme, animate) {
    var root = document.documentElement;

    if (animate) {
      // 蒙版闪一下：颜色本身是瞬时切换的，蒙版只负责视觉过渡。
      // 定个时限摘掉类，避免在动画不推进的环境里一直挂着。
      root.classList.add('theme-switching');
      clearTimeout(root._themeTimer);
      root._themeTimer = setTimeout(function () {
        root.classList.remove('theme-switching');
      }, 400);
    } else {
      clearTimeout(root._themeTimer);
      root.classList.remove('theme-switching');
    }

    root.setAttribute('data-theme', theme);

    var icon = $('[data-theme-icon]');
    var label = $('[data-theme-label]');
    var btn = $('#theme-toggle');

    // 显示“将要切到的模式”，而不是当前模式
    var next = theme === 'dark' ? '浅色' : '深色';
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    if (label) label.textContent = next;
    if (btn) btn.setAttribute('aria-label', '切换到' + next + '主题');
  }

  function initTheme() {
    // 没手动选过时不写 data-theme，交给 CSS 跟随系统
    var saved = savedTheme();
    applyTheme(saved || currentTheme(), false);

    var btn = $('#theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next, true);
    });

    // 没手动选过时，跟随系统变化实时更新
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (savedTheme()) return;   // 已经手动选过就不再跟随系统
        applyTheme(systemTheme(), true);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- 首页大图（作品封面轮换） ----------
     背景层不是固定一张图，而是把各作品的封面排成一组轮播：
       第一张用 SITE_CONFIG.heroImage 负责首屏，
       后面接 SHOWCASE 里每件作品的封面（去重）。
     后面的图懒加载，切换时用 CSS 交叉淡入，不做位移动画，免得糊。 */
  function initHeroImage() {
    var box = $('#hero-figure');
    if (!box) return;

    var list = [];
    function push(src, alt) {
      if (!src) return;
      for (var i = 0; i < list.length; i++) { if (list[i].src === src) return; }
      list.push({ src: src, alt: alt || '' });
    }

    // 只用高清图轮播；HERO_SLIDES 空了才退回配置里那一张
    for (var k = 0; k < HERO_SLIDES.length; k++) {
      push(HERO_SLIDES[k].img, HERO_SLIDES[k].alt);
    }
    if (!list.length) push(SITE_CONFIG.heroImage, SITE_CONFIG.heroImageAlt);

    if (!list.length) { box.hidden = true; return; }

    var slides = list.map(function (item, i) {
      var img = new Image();
      img.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
      img.alt = item.alt;
      img.decoding = 'async';
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.src = item.src;
      if (i === 0) {
        // 首图挂了就整块收起来，别留一个破图标
        img.onerror = function () { box.hidden = true; };
      }
      box.appendChild(img);
      return img;
    });

    if (slides.length < 2) return;

    var cur = 0;
    var timer = null;
    var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    // 关了动效就不自动轮换，只留第一张
    if (RM && RM.matches) return;

    function show(n) {
      var next = (n + slides.length) % slides.length;
      if (next === cur) return;
      slides[cur].classList.remove('is-active');
      slides[next].classList.add('is-active');
      cur = next;
    }

    function tick() {
      // 标签页在后台时不动，省电
      if (document.visibilityState === 'hidden') return;
      show(cur + 1);
    }

    timer = setInterval(tick, 6000);

    // 从往返缓存回来时重置，避免几张图同时是 active
    window.addEventListener('pageshow', function () {
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === cur); });
    });

    // 页面卸载前清掉计时器
    window.addEventListener('pagehide', function () {
      if (timer) { clearInterval(timer); timer = null; }
    });
  }

  /* ---------- 首页底图视差 ----------
     鼠标在 hero 里移动时，整层背景跟着轻微平移（最多 12px），
     和图片自身那条 hero-drift 缩放动画分开作用在不同元素上，互不覆盖。
     用 requestAnimationFrame 做缓动，避免直接跟手导致的生硬。 */
  function initHeroParallax() {
    var fig = $('.hero--banner .hero-figure');
    if (!fig || !fig.parentElement) return;

    // 触屏设备没有鼠标，直接不做
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (RM && RM.matches) return;

    var MAX = 12;          // 最大位移（px）：再大就不"略微"了
    var EASE = 0.12;       // 每帧靠近目标的比例，越小越滞后
    var tx = 0, ty = 0;    // 目标位移
    var cx = 0, cy = 0;    // 当前位移
    var raf = null;

    function paint() {
      cx += (tx - cx) * EASE;
      cy += (ty - cy) * EASE;

      var doneX = Math.abs(tx - cx) < 0.1;
      var doneY = Math.abs(ty - cy) < 0.1;
      if (doneX) cx = tx;
      if (doneY) cy = ty;

      fig.style.transform = 'translate3d(' + cx.toFixed(2) + 'px, ' + cy.toFixed(2) + 'px, 0)';

      if (doneX && doneY) { raf = null; return; }
      raf = requestAnimationFrame(paint);
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(paint);
    }

    var hero = fig.parentElement;

    window.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      // 鼠标离开 hero 区域就不跟，避免整页都在晃
      if (e.clientY < r.top || e.clientY > r.bottom) return;

      // 换到 -1 ~ 1 的区间，再反向推背景（背景往鼠标反方向走才有纵深）
      var px = ((e.clientX - r.left) / r.width) * 2 - 1;
      var py = ((e.clientY - r.top) / r.height) * 2 - 1;

      tx = Math.max(-1, Math.min(1, px)) * -MAX;
      ty = Math.max(-1, Math.min(1, py)) * -MAX;
      kick();
    }, { passive: true });

    // 鼠标移出文档时回中
    document.addEventListener('mouseleave', function () {
      tx = 0; ty = 0; kick();
    });
  }

  /* ---------- 作品展示 ---------- */
  /* ---------- 作品展示 ----------
     两个列表共用一套渲染：
       #showcase-grid  代表作品（正式发布的）
       #showcase-test  尚未正式发布的测试组件
     测试组件单独放 SHOWCASE_TEST，不动 SHOWCASE，
     这样首页与作品页的代表作品不受影响。 */
  function renderWorks(host, list, emptyText) {
    if (!host) return;

    if (!list.length) {
      host.innerHTML = '<p class="works-empty">' + esc(emptyText) + '</p>';
      return;
    }

    host.innerHTML = list.map(function (it, i) {
      var cat = CATEGORIES[it.category] || '';
      // 有 href 的直接指向自己的页面（比如创想之都的子站），否则走通用详情页
      var detailHref = it.href || (it.id ? 'work.html?id=' + esc(it.id) : '');
      var detail = detailHref
        ? '<a class="work-more" href="' + detailHref + '">查看详情 →</a>'
        : '';
      return '' +
        '<article class="work">' +
          '<div class="work-media"><img src="' + esc(it.img) + '" alt="' + esc(it.title + (it.meta ? ' ' + it.meta : '')) + '" decoding="async"></div>' +
          '<div class="work-body">' +
            '<h3>' + esc(it.title) + '</h3>' +
            (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') +
            '<div class="work-meta">' +
              (cat ? '<span class="tag tag--gold">' + esc(cat) + '</span>' : '') +
              (it.meta ? '<span>' + esc(it.meta) + '</span>' : '') +
              detail +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ---------- 作品页的类型筛选 ----------
     只列真的有作品的类型，顺便带上件数。 */
  function initWorkFilter(host) {
    var box = $('#work-filter');
    if (!box || !host) return;

    var items = [{ key: '', label: '全部', n: SHOWCASE.length }];
    Object.keys(CATEGORIES).forEach(function (k) {
      var count = SHOWCASE.filter(function (it) { return it.category === k; }).length;
      if (count > 0) items.push({ key: k, label: CATEGORIES[k], n: count });
    });

    if (items.length < 3) { box.hidden = true; return; }

    box.innerHTML = items.map(function (it, i) {
      return '<button class="tab' + (i === 0 ? ' is-active' : '') + '" type="button"' +
        ' data-work-filter="' + esc(it.key) + '">' + esc(it.label) +
        '<span class="filter-count">' + it.n + '</span></button>';
    }).join('');

    var btns = $$('button[data-work-filter]', box);
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        var key = btn.getAttribute('data-work-filter') || '';
        var list = key
          ? SHOWCASE.filter(function (it) { return it.category === key; })
          : SHOWCASE.slice();
        renderWorks(host, list, '这一类暂时还没有作品。');
      });
    });
  }


  /* 系列作品专题页的横排版式：左侧一张小封面（完整显示不裁切），右侧文字与按钮 */
  function renderWorkBands(host, list, emptyText) {
    if (!host) return;

    if (!list.length) {
      host.innerHTML = '<p class="works-empty">' + esc(emptyText) + '</p>';
      return;
    }

    host.innerHTML = list.map(function (it, i) {
      var cat = CATEGORIES[it.category] || '';
      var href = it.href || (it.id ? 'work-rich.html?id=' + esc(it.id) : '');
      var kicker = [cat, it.meta].filter(Boolean).join(' · ');
      var no = String(i + 1).padStart(2, '0');
      var ACCENTS = ['#5867d8', '#3f8f54', '#7b53a8', '#2f86b8', '#c98a06'];
      var accent = ACCENTS[i % ACCENTS.length];
      return '<a class="work-band" href="' + href + '" style="--band-accent:' + accent + '">' +
        '<span class="work-band__media"><img src="' + esc(it.img) + '" alt="' + esc(it.title) + '" decoding="async"></span>' +
        '<span class="work-band__body">' +
          '<span class="work-band__kicker">' + esc(kicker) + '</span>' +
          (it.en ? '<span class="work-band__en">' + it.en.split(' ').map(function (w, wi, arr) {
            return '<span' + (wi > 0 ? ' class="hd-out"' : '') + '>' + esc(w) + '</span>';
          }).join(' ') + '</span>' : '') +
          '<span class="work-band__title">' + esc(it.title) + '</span>' +
          (it.desc ? '<span class="work-band__desc">' + esc(it.desc) + '</span>' : '') +
          '<span class="work-band__go">查看详情 →</span>' +
        '</span>' +
        '<span class="work-band__deco" aria-hidden="true">' +
          '<span class="work-band__no">' + no + '</span>' +
          '<span class="work-band__barcode"></span>' +
        '</span>' +
      '</a>';
    }).join('');
  }

  function initShowcase() {
    var mainHost = $('#showcase-grid');
    if (mainHost) {
      var filter = mainHost.getAttribute('data-category') || '';
      var limit = parseInt(mainHost.getAttribute('data-limit'), 10);

      var list = filter
        ? SHOWCASE.filter(function (it) { return it.category === filter; })
        : SHOWCASE.slice();
      if (limit > 0) list = list.slice(0, limit);

      renderWorks(mainHost, list, '作品还在整理中。');
    }

    // 系列作品专题页（作品页默认栏）：在官网发布的作品
    renderWorkBands($('#showcase-home'), SHOWCASE_HOME, '目前还没有在官网发布的作品。有作品在这里首发时，会先出现在这一栏。');

    // 首页「系列作品专题页」：同一份数据，首页按 data-limit 只显示前几件
    var homeOnline = $('#showcase-online');
    if (homeOnline) {
      var onlineLimit = parseInt(homeOnline.getAttribute('data-limit'), 10);
      var onlineList = onlineLimit > 0 ? SHOWCASE_HOME.slice(0, onlineLimit) : SHOWCASE_HOME.slice();
      renderWorkBands(homeOnline, onlineList, '目前还没有在官网发布的作品。有作品在这里首发时，会先出现在这一栏。');
    }

    // 测试组件那一栏（作品页）
    renderWorks($('#showcase-test'), SHOWCASE_TEST, '暂时还没有测试组件。');

    // 首页「测试中作品」：和作品页那一栏同一份数据，首页只显示前 3 条
    var homeTest = $('#showcase-test-home');
    if (homeTest) {
      var homeLimit = parseInt(homeTest.getAttribute('data-limit'), 10);
      var homeList = homeLimit > 0 ? SHOWCASE_TEST.slice(0, homeLimit) : SHOWCASE_TEST.slice();
      renderWorks(homeTest, homeList, '目前没有正在测试的组件。有作品进入测试后，会先出现在这里。');
    }

    // 作品页「代表作品」的类型筛选
    initWorkFilter(mainHost);

    // 两栏的件数（不受筛选影响）
    var counter = $('#work-count');
    if (counter) counter.textContent = SHOWCASE.length;

    var testCounter = $('#test-count');
    if (testCounter) testCounter.textContent = SHOWCASE_TEST.length;

    var homeCounter = $('#home-count');
    if (homeCounter) homeCounter.textContent = SHOWCASE_HOME.length;
  }

  /* ---------- 作品详情页 ----------
     地址形如 work.html?id=log-shader-sa
     HTML 里已经写了一份默认内容（Log橡木SA），
     所以即使 JS 没跑起来或者 id 不对，页面也不会空白。 */
  /* 作品详情页的外链按钮组
     links: [{ title, items: [{ label, href }] }]
     全部走 target=_blank，并带 rel=noopener */
  function renderWorkLinks(groups) {
    return '<div class="work-links">' + groups.map(function (g) {
      var title = g.title
        ? '<p class="work-links__title">' + esc(g.title) + '</p>'
        : '';
      // solid: true 的组用实心按钮（黑底白字），没写的沿用描边
      var btnClass = g.solid
        ? 'btn btn--sm work-links__solid'
        : 'btn btn--ghost btn--sm';
      var row = (g.items || []).map(function (it) {
        return '<a class="' + btnClass + '" href="' + esc(it.href) + '" ' +
          'target="_blank" rel="noopener">' + esc(it.label) + '</a>';
      }).join('');
      return '<div class="work-links__group">' + title +
        '<div class="work-links__row">' + row + '</div></div>';
    }).join('') + '</div>';
  }

  function initWorkDetail() {
    var host = $('#work-detail');
    if (!host) return;

    var id = '';
    try {
      id = new URLSearchParams(location.search).get('id') || '';
    } catch (e) {
      // 老浏览器：手动解析
      var m = /[?&]id=([^&]+)/.exec(location.search);
      id = m ? decodeURIComponent(m[1]) : '';
    }

    var work = WORKS[id];
    if (!work) {
      // 没带 id 或 id 不存在：保留 HTML 里的默认代表作，并提示一句
      if (id) {
        var note = $('#work-notice');
        if (note) {
          note.hidden = false;
          note.className = 'callout';
          note.innerHTML = '<span class="icon" aria-hidden="true">🛈</span><div>' +
            '没找到编号为 <code>' + esc(id) + '</code> 的作品，下面展示的是代表作 ' +
            '<b>Log橡木SA</b>。<a href="works.html">回作品列表</a></div>';
        }
      }
      // 走兜底分支时，放大功能也得能用 —— 从页面上已有的静态内容里取截图
      initLightbox(null);
      return;
    }

    document.title = work.name + ' | 创想时代开发组';

    // 顶图就用这件作品的封面（和下面那张完整封面是同一张）
    buildHeroFigure($('#work-head'), work.cover);

    // 标记 JS 真的跑通了。
    // 页面里有一份写死的兜底内容，长得和渲染结果几乎一样，
    // 光比对文字无法区分「JS 渲染成功」和「JS 没跑、只是静态兜底」，
    // 所以留这个标记给自检用。
    host.setAttribute('data-work-id', id);

    /* 先把「只在部分作品上出现」的区块清空。
       work.html 里写死了一份 LogSA 的兜底内容，如果这件作品没有对应字段，
       不清空就会残留上一件作品的须知 / 鸣谢。 */
    ['#work-notice', '#work-thanks', '#work-nav'].forEach(function (sel) {
      var el = $(sel);
      if (el) { el.hidden = true; el.innerHTML = ''; }
    });

    var setText = function (sel, text) {
      var el = $(sel);
      if (el) el.textContent = text;
    };

    setText('#work-type', work.type || '');
    setText('#work-name', work.name || '');
    setText('#work-tagline', work.tagline || '');
    setText('#work-author', work.author ? '作者：' + work.author : '');
    // 面包屑最后一级也要跟着换，否则一直停在 HTML 里写死的那个作品名
    setText('#work-crumb', work.name || '');
    if (work.name) document.title = work.name + ' | 作品 | 创想时代开发组';

    var desc = $('meta[name="description"]');
    if (desc) {
      desc.setAttribute('content',
        work.name + (work.author ? '（作者 ' + work.author + '）' : '') + '：' +
        (work.tagline || '') + ' —— 创想时代开发组作品展示。');
    }

    // 头图
    // 封面：没有 cover 就把整块留空，绝不退回别的作品的图
    var cover = $('#work-cover');
    var coverFigure = $('#work-cover-figure');
    if (cover && coverFigure && work.cover) {
      cover.src = work.cover;
      cover.alt = work.coverAlt || work.name;
      coverFigure.hidden = false;
    } else if (coverFigure) {
      coverFigure.hidden = true;
    }

    // 左侧信息栏
    var facts = $('#work-facts');
    if (facts && work.facts && work.facts.length) {
      facts.innerHTML = work.facts.map(function (f) {
        var v = f.bold ? '<b>' + esc(f.v) + '</b>' : esc(f.v);
        return '<div><dt>' + esc(f.k) + '</dt><dd>' + v + '</dd></div>';
      }).join('');
    }

    // 正文
    // 有些作品的介绍就是一张成品海报（poster），此时海报排在文字段落前面。
    // 两个都没有就把静态兜底的内容清掉，免得残留上一件作品。
    var intro = $('#work-intro');
    if (intro) {
      var parts = [];

      // 链接块放最上面的作品（linksTop: true）：先渲染按钮，再走正文
      if (work.linksTop && work.links && work.links.length) {
        parts.push(renderWorkLinks(work.links));
      }

      if (work.poster) {
        parts.push(
          '<figure class="work-poster">' +
            // 海报动辄几百 KB，滚到附近再下载，别让它跟首屏抢带宽
            '<img src="' + esc(work.poster) + '" alt="' + esc(work.posterAlt || work.name) +
              '" loading="lazy" decoding="async">' +
          '</figure>'
        );
      }
      if (work.intro && work.intro.length) {
        parts.push(work.intro.map(function (p) {
          // 纯字符串 = 一段正文
          if (typeof p === 'string') return '<p>' + esc(p) + '</p>';
          // { heading } = 小标题
          if (p.heading) return '<h3 class="work-heading">' + esc(p.heading) + '</h3>';
          // { img } = 单张大图
          if (p.img) {
            return '<figure class="work-figure">' +
              '<img src="' + esc(p.img) + '" alt="' + esc(p.alt || work.name) + '" loading="lazy" decoding="async">' +
            '</figure>';
          }
          // { imgs } = 一组并排的图
          if (p.imgs && p.imgs.length) {
            return '<div class="work-figure-grid">' + p.imgs.map(function (it) {
              var src = typeof it === 'string' ? it : it.img;
              var alt = typeof it === 'string' ? work.name : (it.alt || work.name);
              return '<figure class="work-figure">' +
                '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
              '</figure>';
            }).join('') + '</div>';
          }
          // { list } = 一组条目
          if (p.list && p.list.length) {
            return '<ul class="work-list">' + p.list.map(function (it) {
              return '<li>' + esc(it) + '</li>';
            }).join('') + '</ul>';
          }
          // { links } = 一组按钮
          if (p.links && p.links.length) return renderWorkLinks(p.links);
          return '';
        }).join(''));
      }

      // 获取与外部链接：一律渲染成按钮，不做正文里的超链接
      // linksTop 的已经排在最前面了，这里不要再重复一遍
      if (!work.linksTop && work.links && work.links.length) {
        parts.push(renderWorkLinks(work.links));
      }

      intro.innerHTML = parts.join('');

      // 正文目录：小标题够多才做，少了没必要
      var tocHost = $('#work-toc');
      if (tocHost) {
        var heads = $$('#work-intro .work-heading');
        if (heads.length >= 3) {
          heads.forEach(function (h, i) {
            h.id = 'sec-' + (i + 1);
          });
          tocHost.innerHTML = '<nav class="work-toc" aria-label="正文目录">' +
            '<p class="work-toc__title">本页目录</p><ol>' +
            heads.map(function (h) {
              return '<li><a href="#' + h.id + '">' + esc(h.textContent.trim()) + '</a></li>';
            }).join('') +
            '</ol></nav>';
        } else {
          tocHost.innerHTML = '';
        }
      }
    }

    // 鸣谢 / 反馈渠道
    var thanks = $('#work-thanks');
    var thanksPanel = thanks && thanks.parentElement ? thanks.parentElement : null;
    if (thanksPanel && (!work.thanks || !work.thanks.length)) {
      thanksPanel.hidden = true;
    }
    if (thanks && work.thanks && work.thanks.length) {
      thanks.hidden = false;
      thanks.innerHTML = work.thanks.map(function (t) {
        return '<div><dt>' + esc(t.k) + '</dt><dd>' + esc(t.v) + '</dd></div>';
      }).join('');
    }

    // 截图
    // 页面上只显示图片，不显示文字说明；说明只写进 alt 供屏幕阅读器与搜索引擎使用。
    var shots = $('#work-shots');
    var shotsSection = shots ? shots.closest('section') : null;

    // 系列作品专题页（SHOWCASE_HOME）里的作品一律不列截图 —— 图片都直接插在正文对应位置。
    // 这条是硬规则，写在代码里，不靠数据里记得清空 shots。
    var isSiteWork = SHOWCASE_HOME.some(function (it) { return it.id === work.id; });
    var shotList = isSiteWork ? [] : (work.shots || []);

    if (shotsSection && !shotList.length) {
      shotsSection.hidden = true;
      // 顺手把 HTML 里那份静态兜底的截图清掉，免得 DOM 里留着别的作品的图
      if (shots) shots.innerHTML = '';
    }
    if (shots && shotList.length) {
      // 截图可以带 group 标记，分组变了就插一条小标题（例如按 Java / 基岩版分）
      var lastGroup = null;
      shots.innerHTML = shotList.map(function (s, i) {
        var head = '';
        if (s.group && s.group !== lastGroup) {
          lastGroup = s.group;
          head = '<p class="shot-group">' + esc(s.group) + '</p>';
        }
        return head +
          '<figure class="shot">' +
            '<button class="shot-btn" type="button" data-index="' + i + '"' +
              ' aria-label="放大查看第 ' + (i + 1) + ' 张截图">' +
              '<img src="' + esc(s.img) + '" alt="' + esc(s.alt || work.name) + '" decoding="async">' +
            '</button>' +
          '</figure>';
      }).join('');
    }

    // 使用须知
    var notice = $('#work-notice');
    if (notice && work.notice) {
      notice.hidden = false;
      notice.className = 'callout';
      notice.innerHTML = '<span class="icon" aria-hidden="true">🛈</span><div>' +
        esc(work.notice) + '</div>';
    }

    // 上一件 / 下一件
    var ids = Object.keys(WORKS);
    if (ids.length > 1) {
      var idx = ids.indexOf(id);
      var prev = WORKS[ids[(idx - 1 + ids.length) % ids.length]];
      var next = WORKS[ids[(idx + 1) % ids.length]];
      var nav = $('#work-nav');
      if (nav) {
        nav.hidden = false;
        nav.innerHTML =
          '<a class="btn btn--ghost btn--sm" href="work.html?id=' + esc(ids[(idx - 1 + ids.length) % ids.length]) + '">← ' + esc(prev.name) + '</a>' +
          '<a class="btn btn--ghost btn--sm" href="work.html?id=' + esc(ids[(idx + 1) % ids.length]) + '">' + esc(next.name) + ' →</a>';
      }
    }

    // 正文里的图也能点开放大：接到同一份列表里，序号接着截图往后排
    var allShots = shotList.slice();
    $$('#work-intro img').forEach(function (el) {
      var src = el.getAttribute('src');
      if (!src) return;
      el.setAttribute('data-index', String(allShots.length));
      allShots.push({ img: src, alt: el.getAttribute('alt') || work.name });
    });

    initLightbox(allShots);
  }

  /* ---------- 截图放大 ----------
     传入 shots 就用它；传 null / 空数组时，直接从页面上已有的截图读，
     这样静态兜底分支也能有放大功能。 */
  function initLightbox(shots) {
    var box = $('#lightbox');
    if (!box) return;

    if (!shots || !shots.length) {
      shots = $$('#work-shots .shot').map(function (fig) {
        var img = fig.querySelector('img');
        return {
          img: img ? img.getAttribute('src') : '',
          alt: img ? (img.getAttribute('alt') || '') : ''
        };
      }).filter(function (s) { return s.img; });
    }
    if (!shots.length) return;

    var img = $('#lightbox-img');
    var cap = $('#lightbox-caption');
    var lastFocus = null;
    var cur = 0;
    var prevBtn = $('#lightbox-prev');
    var nextBtn = $('#lightbox-next');

    function show(i) {
      cur = i;
      img.src = shots[i].img;
      img.alt = shots[i].alt || '';
    }

    // 上一张 / 下一张，走到头就绕回另一头
    function step(dir) {
      if (box.hidden || shots.length < 2) return;
      show((cur + dir + shots.length) % shots.length);
    }

    function open(i) {
      var s = shots[i];
      if (!s) return;
      cur = i;
      lastFocus = document.activeElement;
      img.src = s.img;
      // 放大层不显示文字说明，只把说明留给 alt
      img.alt = s.alt || '';
      if (cap) { cap.textContent = ''; cap.hidden = true; }
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      // 只有一张图时不显示翻页按钮
      if (prevBtn) prevBtn.hidden = shots.length < 2;
      if (nextBtn) nextBtn.hidden = shots.length < 2;
      $('#lightbox-close').focus();
    }

    function close() {
      box.hidden = true;
      img.removeAttribute('src');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('.shot-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        open(Number(btn.getAttribute('data-index')));
      });
    });

    // 正文插图：点一下放大
    $$('#work-intro img[data-index]').forEach(function (el) {
      el.addEventListener('click', function () {
        open(Number(el.getAttribute('data-index')));
      });
    });

    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });

    $('#lightbox-close').addEventListener('click', close);
    box.addEventListener('click', function (e) {
      // 点背景关闭，点图片本身不关
      if (e.target === box) close();
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- 通用图片放大层 ----------
     city 系列（创想之都子站）用：页面上标了 data-zoom 的图片都能点开，
     复用同一个 #lightbox，支持左右翻页与 Esc 关闭。 */
  function initZoomGallery() {
    var box = $('#lightbox');
    if (!box) return;

    var items = $$('[data-zoom]').filter(function (el) {
      return el.tagName === 'IMG' && el.getAttribute('src');
    });
    if (!items.length) return;

    var img = $('#lightbox-img');
    var cap = $('#lightbox-caption');
    var prevBtn = $('#lightbox-prev');
    var nextBtn = $('#lightbox-next');
    var lastFocus = null;
    var cur = 0;

    function capOf(el) {
      var fig = el.closest('figure');
      var fc = fig ? fig.querySelector('figcaption') : null;
      return fc ? fc.textContent.trim() : (el.getAttribute('alt') || '');
    }

    function show(i) {
      cur = i;
      var el = items[i];
      img.src = el.getAttribute('src');
      img.alt = el.getAttribute('alt') || '';
      if (cap) {
        var t = capOf(el);
        cap.textContent = t;
        cap.hidden = !t;
      }
    }

    function step(dir) {
      if (box.hidden || items.length < 2) return;
      show((cur + dir + items.length) % items.length);
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      if (prevBtn) prevBtn.hidden = items.length < 2;
      if (nextBtn) nextBtn.hidden = items.length < 2;
      $('#lightbox-close').focus();
    }

    function close() {
      box.hidden = true;
      img.removeAttribute('src');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    items.forEach(function (el, i) {
      el.addEventListener('click', function () { open(i); });
    });

    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    $('#lightbox-close').addEventListener('click', close);
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- 页面切换动效 ----------
     进场靠 CSS 的 page-in 动画，这里只管两件事：
       1. 点站内链接时先播 0.2 秒的离场态，再真正跳转
       2. 从往返缓存回来（浏览器后退）时把离场态清掉，别让页面停在全透明
     以下情况一律不拦：新窗口、下载、外站、页内锚点、按住修饰键点击。 */
  function initPageTransition() {
    // 浏览器自带跨页过渡时交给 CSS（@view-transition），别再叠一层蒙版
    if ('onpageswap' in window) return;

    var body = document.body;
    var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

    function clearLeaving() { body.classList.remove('is-leaving'); }

    // 返回 / 前进时清掉，避免停在透明状态
    window.addEventListener('pageshow', clearLeaving);
    window.addEventListener('pagehide', clearLeaving);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // 动画被关掉时直接放行，不做任何延迟
      if (REDUCED && REDUCED.matches) return;

      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;

      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      // 同页只换锚点的不拦
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

      e.preventDefault();
      body.classList.add('is-leaving');
      setTimeout(function () { location.href = a.href; }, 200);

      // 兜底：万一上面那次跳转被浏览器拦了，2 秒后把页面恢复回来
      setTimeout(function () {
        if (document.visibilityState !== 'hidden') clearLeaving();
      }, 2000);
    });
  }

  /* ---------- 子页面 INDEX 行式索引 ----------
     不用手写：直接把本页各个 .section-head 收上来，编号、标题、英文标签都从已有的 DOM 里取，
     再给所在 section 补一个可跳转的 id。以后加删区块，索引自动跟着变。 */
  function initPageIndex() {
    var host = $('#page-index');
    if (!host) return;

    var main = $('#main');
    if (!main) return;

    var heads = Array.prototype.slice.call(main.querySelectorAll('.section-head'));
    if (!heads.length) { host.hidden = true; return; }

    var rows = heads.map(function (head, i) {
      var sec = head.closest ? head.closest('section') : null;
      if (!sec) return '';
      if (!sec.id) sec.id = 'sec-' + (i + 1);

      var t = head.querySelector('h2');
      var en = head.querySelector('.kicker');

      // 有些区块藏在标签页后面（例如作品页的「测试组件」），
      // 记下所属面板，点索引时先切过去再滚过去。
      var panel = head.closest ? head.closest('.tab-panel') : null;

      return '<a class="page-index__row" href="#' + esc(sec.id) + '"' +
          (panel ? ' data-tab="' + esc(panel.id) + '"' : '') + '>' +
        '<span class="page-index__n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<span class="page-index__t">' + esc(t ? t.textContent.trim() : '') + '</span>' +
        '<span class="page-index__en">' + esc(en ? en.textContent.trim() : '') + '</span>' +
        '<span class="page-index__go" aria-hidden="true">↓</span>' +
      '</a>';
    }).join('');

    host.hidden = false;
    host.innerHTML =
      '<div class="page-index__head"><span>Index :// 本页内容</span>' +
      '<span>共 ' + heads.length + ' 项</span></div>' + rows;

    // 目标在隐藏的标签页里时：先点对应的 tab 让它显示，再滚过去
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('.page-index__row') : null;
      if (!a) return;

      var panelId = a.getAttribute('data-tab');
      if (!panelId) return;

      var panel = document.getElementById(panelId);
      if (!panel) return;

      e.preventDefault();

      if (panel.hidden) {
        var tab = document.querySelector('.tabs .tab[aria-controls="' + panelId + '"]');
        if (tab) tab.click();
      }

      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      var y = target.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  }

  /* ---------- 子页面整幅头图 ----------
     结构写在 HTML 上的 data-hero="图片地址"，这里补背景层与遮罩，
     视觉与首页完全一致（复用 .hero--banner 的样式）。
     没写 data-hero 的页面就保持原来的纯色头图。 */
  /* 首屏如果是整幅大图，让 main 顶上去，图就能铺到页眉底下 */
  function initHeroOverlap() {
    var main = $('#main');
    if (!main) return;
    var first = main.firstElementChild;
    while (first && first.nodeType !== 1) first = first.nextElementSibling;
    if (first && first.classList && first.classList.contains('hero--banner')) {
      main.classList.add('overlap-hero');
    }
  }


  /* ---------- 系列作品专题页：小站式作品详情 ----------
     work-rich.html?id=xxx 用。和普通详情页不同的是：
     顶部大图 + 目录 + 每一节做成卡片 + 图片可放大 + 链接集中到底部。 */
  function initRichWork() {
    var host = $('#rw-body');
    if (!host) return;

    var id = '';
    try {
      id = new URLSearchParams(location.search).get('id') || '';
    } catch (e) {
      var m = /[?&]id=([^&]+)/.exec(location.search);
      id = m ? decodeURIComponent(m[1]) : '';
    }

    var work = WORKS[id];
    if (!work) {
      var first = Object.keys(WORKS)[0];
      work = WORKS[first];
      id = first;
    }
    if (!work) return;

    document.title = work.name + ' | 创想时代开发组';

    /* 头部 */
    var setText = function (sel, text) {
      var el = $(sel);
      if (el && text) el.textContent = text;
      return el;
    };
    setText('#rw-crumb', work.name);
    setText('#rw-type', work.type || '作品');
    setText('#rw-code', 'WORKS · ' + (work.displayEn || work.name));
    setText('#rw-name', work.name);
    setText('#rw-tagline', work.tagline || '');
    setText('#rw-author', work.author ? '作者：' + work.author : '');

    var display = $('#rw-display');
    if (display && work.displayEn) {
      // 用 | 手动分行：SEADREAM | VOYAGER 这种两行最好看，没有 | 就按空格分行
      var words = work.displayEn.split(work.displayEn.indexOf('|') >= 0 ? '|' : ' ');
      display.innerHTML = words.map(function (w, i) {
        return '<span' + (i === words.length - 1 && words.length > 1 ? ' class="hd-out"' : '') + '>' + esc(w) + '</span>';
      }).join('');
    }

    buildHeroFigure($('#rw-head'), work.cover);

    /* 顶部按钮 */
    var cta = $('#rw-cta');
    if (cta) {
      cta.innerHTML =
        '<a class="btn" href="#rw-body">看正文</a>' +
        '<a class="btn btn--ghost" href="#rw-about">作品信息</a>' +
        (work.links && work.links.length ? '<a class="btn btn--ghost" href="#rw-links-section">下载与链接</a>' : '');
    }

    /* 作品信息 */
    var facts = $('#rw-facts');
    if (facts && work.facts && work.facts.length) {
      facts.innerHTML = work.facts.map(function (f) {
        var v = f.bold ? '<b>' + esc(f.v) + '</b>' : esc(f.v);
        return '<div><dt>' + esc(f.k) + '</dt><dd>' + v + '</dd></div>';
      }).join('');
    }

    /* 正文：按小标题拆成卡片 */
    var blocks = work.intro || [];
    var sections = [{ title: '', items: [] }];
    blocks.forEach(function (b) {
      if (b && typeof b === 'object' && b.heading) {
        sections.push({ title: b.heading, items: [] });
      } else {
        sections[sections.length - 1].items.push(b);
      }
    });

    function renderItem(b) {
      if (typeof b === 'string') return '<p>' + esc(b) + '</p>';

      if (b.list) {
        return '<ul class="feature-list">' + b.list.map(function (li) {
          return '<li>' + esc(li) + '</li>';
        }).join('') + '</ul>';
      }

      if (b.imgs && b.imgs.length) {
        return '<div class="ms-shots">' + b.imgs.map(function (im) {
          return '<img src="' + esc(im.img) + '" alt="' + esc(im.alt || '') + '" data-zoom decoding="async">';
        }).join('') + '</div>';
      }

      if (b.img) {
        return '<figure class="ms-figure"><img src="' + esc(b.img) + '" alt="' + esc(b.alt || '') + '" data-zoom decoding="async"></figure>';
      }

      if (b.links && b.links.length) {
        return '<div class="ms-links">' + renderWorkLinks(b.links) + '</div>';
      }

      if (b.blockquote) return '<blockquote>' + esc(b.blockquote) + '</blockquote>';
      return '';
    }

    var html = '';
    var tocItems = [];
    var idx = 0;

    sections.forEach(function (sec) {
      if (!sec.title && !sec.items.length) return;

      if (!sec.title) {
        html += '<section class="section section--tight"><div class="wrap">' +
          sec.items.map(renderItem).join('') + '</div></section>';
        return;
      }

      idx += 1;
      var anchor = 'sec-' + idx;
      tocItems.push({ id: anchor, label: sec.title });

      html += '<section class="section section--tight ms-section" id="' + anchor + '">' +
        '<div class="wrap">' +
          '<div class="ms-head">' +
            '<span class="ms-head__no">— ' + String(idx).padStart(2, '0') + '</span>' +
            '<h2>' + esc(sec.title) + '</h2>' +
          '</div>' +
          '<div class="ms-section__body">' + sec.items.map(renderItem).join('') + '</div>' +
        '</div>' +
      '</section>';
    });

    host.innerHTML = html;

    /* 目录 */
    var toc = $('#rw-toc');
    if (toc && tocItems.length) {
      toc.innerHTML = '<a href="#rw-about"><i>00</i><span>作品信息</span></a>' +
        tocItems.map(function (t, i) {
          return '<a href="#' + t.id + '"><i>' + String(i + 1).padStart(2, '0') + '</i><span>' + esc(t.label) + '</span></a>';
        }).join('') +
        (work.links && work.links.length ? '<a href="#rw-links-section"><i>§</i><span>下载与链接</span></a>' : '');
      toc.hidden = false;
    }

    /* 链接 */
    if (work.links && work.links.length) {
      var linkHost = $('#rw-links');
      var linkSection = $('#rw-links-section');
      if (linkHost) linkHost.innerHTML = renderWorkLinks(work.links);
      var linkNo = $('#rw-links-no');
      if (linkNo) linkNo.textContent = '— ' + String(tocItems.length + 1).padStart(2, '0');
      if (linkSection) linkSection.hidden = false;
    }
  }

  /* 给一个 hero 挂上背景大图与压暗层。
     子页面（data-hero）和作品详情页（用作品封面）共用这一套。 */
  function buildHeroFigure(hero, src) {
    if (!hero || !src) return;
    if (hero.querySelector('.hero-figure')) return;   // 防重复执行

    var fig = document.createElement('div');
    fig.className = 'hero-figure';
    fig.setAttribute('aria-hidden', 'true');

    var img = new Image();
    img.src = src;
    img.alt = '';
    img.loading = 'eager';
    img.decoding = 'async';
    // 轮播那套 CSS 把 .hero-figure img 默认设成 opacity:0，
    // 靠 is-active 才显出来。这里只有一张图，直接标成激活。
    img.className = 'is-active';
    img.onerror = function () { fig.hidden = true; };
    fig.appendChild(img);

    var veil = document.createElement('div');
    veil.className = 'hero-veil';
    veil.setAttribute('aria-hidden', 'true');

    hero.insertBefore(fig, hero.firstChild);
    hero.insertBefore(veil, fig.nextSibling);
  }

  function initPageHero() {
    $$('.hero--page[data-hero]').forEach(function (hero) {
      buildHeroFigure(hero, hero.getAttribute('data-hero'));
    });
  }

  /* ---------- 页眉：顶部透明，下滑变毛玻璃 ----------
     只在滚动时切一个类，具体动效全交给 CSS 过渡。
     rAF 节流，别在被动事件里直接改样式。 */
  function initHeaderScroll() {
    var header = $('.site-header');
    if (!header) return;

    var THRESHOLD = 28;
    var ticking = false;

    function apply() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      header.classList.toggle('is-scrolled', y > THRESHOLD);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    // 浏览器后退回来时会恢复滚动位置，得再算一次
    window.addEventListener('pageshow', apply);
  }

  /* ---------- 页面内目录高亮 ----------
     长页面（系列作品专题页）顶部的目录条：滚动到哪一节，对应项就高亮。 */
  function initAnchorToc() {
    var toc = $('.ms-toc');
    if (!toc) return;

    var links = $$('.ms-toc a').filter(function (a) {
      return (a.getAttribute('href') || '').charAt(0) === '#';
    });
    if (!links.length) return;

    var targets = links.map(function (a) {
      return { link: a, el: $(a.getAttribute('href')) };
    }).filter(function (t) { return t.el; });

    function update() {
      var y = window.pageYOffset + 140;
      var current = null;
      targets.forEach(function (t) {
        if (t.el.offsetTop <= y) current = t;
      });
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (current) current.link.classList.add('is-active');
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });

    update();
  }

  /* ---------- 回到顶部 ----------
     往下滑过一屏才露出来，点一下平滑回顶。 */
  function initBackToTop() {
    if (document.querySelector('.to-top')) return;

    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '回到顶部');
    btn.title = '回到顶部';
    btn.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.appendChild(btn);

    var ticking = false;

    function update() {
      var on = window.pageYOffset > window.innerHeight * 0.8;
      btn.classList.toggle('is-on', on);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    update();
  }

  /* ---------- 赛博撸猫 ----------
     点猫头：眯眼、抖一下、冒爱心、换一句招呼，次数存本地。 */
  function initCyberCat() {
    var stage = $('#cat-stage');
    var btn = $('#cat-btn');
    var bubble = $('#cat-bubble');
    var countEl = $('#cat-count');
    if (!stage || !btn) return;

    var WORDS = ['喵', '呼噜噜', '咪', '喵喵喵', '蹭蹭'];
    var KEY = 'ia-cat-pets';
    var count = 0;

    try {
      count = parseInt(localStorage.getItem(KEY) || '0', 10) || 0;
    } catch (e) {
      count = 0;
    }
    if (countEl) countEl.textContent = String(count);

    var timer = null;
    var looseTimer = null;

    function heart() {
      var h = document.createElement('span');
      h.className = 'cat-heart';
      h.textContent = '♥';
      h.style.setProperty('--dx', (Math.random() * 90 - 45).toFixed(0) + 'px');
      h.style.left = (42 + Math.random() * 16).toFixed(1) + '%';
      stage.appendChild(h);
      setTimeout(function () {
        if (h.parentNode) h.parentNode.removeChild(h);
      }, 1100);
    }

    function pet() {
      count += 1;
      if (countEl) countEl.textContent = String(count);
      try {
        localStorage.setItem(KEY, String(count));
      } catch (e) {}

      stage.classList.add('is-pet');
      clearTimeout(timer);
      timer = setTimeout(function () { stage.classList.remove('is-pet'); }, 450);

      if (bubble) {
        var word = count % 7 === 0 ? '喵喵喵喵喵！' : WORDS[Math.floor(Math.random() * WORDS.length)];
        bubble.textContent = word;
        bubble.classList.add('is-on');
        clearTimeout(looseTimer);
        looseTimer = setTimeout(function () { bubble.classList.remove('is-on'); }, 1100);
      }

      heart();
      if (count % 5 === 0) heart();
    }

    btn.addEventListener('click', pet);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pet();
      }
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    markActiveNav();
    fillYear();
    applyConfigToDom();
    renderAnnouncements();
    initNoticeFilter();
    initTabs();
    initCopy();
    initSurvey();
    initTheme();
    initHeaderScroll();
    initHeroOverlap();
    initHeroImage();
    initPageHero();
    // 视差要等上面把子页面的 .hero-figure 建出来之后再挂，
    // 否则子页面此时还没有这个元素，监听会落空。
    initHeroParallax();
    initShowcase();
    initWorkDetail();
    initRichWork();
    initZoomGallery();
    initAnchorToc();
    initBackToTop();
    initCyberCat();
    initPageTransition();
    initPageIndex();
    initArticle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
