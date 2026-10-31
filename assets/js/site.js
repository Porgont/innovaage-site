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

    /* 访问量统计：
       busuanzi  true = 页脚显示「访问 N 次 / 访客 N 人」（不蒜子，免费、不用注册）
       baiduId   填百度统计的站点 ID（形如 a1b2c3d4e5f6...）就同时上报到百度统计后台
       两个都要的话就都填 */
    analytics: {
      busuanzi: false,
      baiduId: ''
    },
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

  /* 代表作品卡片数据不写在代码里：放在 content/works.json，
     用 Pages CMS 就能以表单形式增删改（字段见 .pages.yml）。
     专题页（SHOWCASE_HOME）与测试中作品（SHOWCASE_TEST）仍然写在下面，
     它们各有各的排版，不做模板化。 */
  var SHOWCASE = [];

  /* 代表作品的详情页数据（也是从 content/works.json 来）。
     测试中作品没有进这份表，仍走代码里的 WORKS。 */
  var WORK_DETAILS = {};

  /* 系列作品专题页（work-rich.html）的内容。
     排版由代码固定，作者在网页后台只改文字与图片。 */
  var TOPIC_PAGES = {};
  var TOPIC_WORK = {};

  /* 系列作品专题页 —— 在官网上发布的作品，字段与 SHOWCASE 相同。
     作品页默认打开的就是这一栏。 */
  var SHOWCASE_HOME = [
    {
      id: 'mengsea',
      href: 'mengsea.html',
      img: 'assets/img/mengsea/cover.jpg',
      title: '梦海旅者',
      en: 'SEADREAM VOYAGER',
      meta: '作者：暴走苏打',
      category: 'map',
      plat: '仅BE',
      desc: '幻境与现实交织的<span class="mark">大型剧情向解密</span>地图，《幻世编年史》系列第一部'
    },
    {
      id: 'uransch',
      href: 'work-rich.html?id=uransch',
      img: 'assets/img/uransch-cover.jpg',
      title: '无人区跑酷',
      en: 'URANSCH PARKOUR',
      meta: '作者：柑柠',
      category: 'map',
      plat: 'BE/JE',
      desc: '箱庭式<span class="mark">中高难度</span>跑酷地图，从 2016 年做到现在，<span class="mark">56 个关卡</span>，基岩版与 Java 版同玩法'
    },
    {
      id: 'fangzhen-tech',
      href: 'work-rich.html?id=fangzhen-tech',
      img: 'assets/img/fangzhen-cover.jpg',
      title: '仿真工艺系列材质',
      en: 'REALCRAFT TEXTURE',
      meta: '作者：茫帛',
      category: 'tex',
      plat: 'BE/JE',
      desc: '<span class="mark">风格化写实</span>、偏生存实用向的材质包，<span class="mark">历时近四年</span>制作，现有多种版本可选'
    },
    {
      id: 'city',
      href: 'city.html',
      img: 'assets/img/city/cover.jpg',
      title: '创想之都',
      en: 'CHUANGXIANG CITY',
      meta: '发起：苏打、柑柠',
      category: 'map',
      plat: 'BE/JE',
      desc: '由创想时代开发组苏打与柑柠发起的一个建设 MC 城市地图的<span class="mark">大型项目</span>，正式开始建设于 2022 年 8 月'
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
      tagline: '箱庭式<span class="mark">中高难度</span>跑酷地图，<span class="mark">56 个关卡</span>，基岩版与 Java 版同玩法',
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
      tagline: '<span class="mark">风格化写实</span>、偏生存实用向的材质包，<span class="mark">历时近四年</span>制作',
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
        '仿真工艺：一款<span class="mark">风格化写实</span>、偏生存实用向的材质包，历时近四年的制作，不断的优化、改进，目前有多种版本可供选择。',
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
  /* 公告数据不写在代码里：放在 content/announcements.json，
     用 Pages CMS 打开仓库就能以表单形式增删改（字段见 .pages.yml）。
     页面启动时读一次，读到之前列表是骨架屏。 */
  var ANNOUNCEMENTS = [];

  function loadContent() {
    if (!window.fetch) return Promise.resolve();

    function read(path, key) {
      return fetch(path, { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data) return;
          var list = data[key] || data;
          return Array.isArray(list) ? list : null;
        });
    }

    return Promise.all([
      read('content/announcements.json', 'announcements'),
      read('content/works.json', 'works'),
      read('content/topic-pages.json', 'pages')
    ]).then(function (both) {
      // 标签在 CMS 里可能存成「招募,代投」这样的字符串，统一成数组
      function tagsOf(v) {
        if (Array.isArray(v)) return v.filter(Boolean);
        if (typeof v === 'string') {
          return v.split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean);
        }
        return [];
      }

      ANNOUNCEMENTS = (both[0] || []).filter(function (n) { return n && n.id && n.title; })
        .map(function (n) {
          n.tags = tagsOf(n.tags);
          n.pin = n.pin === true || n.pin === 'true';
          // 有些编辑器会把日期写成带时间的完整格式，这里统一裁成 年-月-日
          var d = String(n.date || '');
          var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
          n.date = m ? m[1] + '-' + m[2] + '-' + m[3] : d;
          return n;
        });

      SHOWCASE = (both[1] || []).filter(function (w) { return w && w.title; });

      TOPIC_PAGES = {};
      TOPIC_WORK = {};
      (both[2] || []).forEach(function (p) {
        if (!p || !p.id || !p.name) return;
        TOPIC_PAGES[p.id] = p;
        TOPIC_WORK[p.id] = topicToWork(p);
      });

      // 有 type 或 body 的条目才算写了详情页
      WORK_DETAILS = {};
      SHOWCASE.forEach(function (w) {
        if (!w || !w.id) return;
        // 后台表单把详情字段收进了 detail 组；旧数据是平铺的，两种都认
        var d = w.detail || w;
        if (!d.type && !d.body) return;
        WORK_DETAILS[w.id] = {
          id: w.id,
          name: w.title,
          author: d.author || '',
          type: d.type || '',
          tagline: d.tagline || w.desc || '',
          cover: d.cover || w.img || '',
          coverAlt: d.coverAlt || w.title || '',
          facts: d.factsText ? parsePairLines(d.factsText) : (Array.isArray(d.facts) ? d.facts : []),
          poster: d.poster || '',
          posterAlt: d.posterAlt || '',
          notice: d.notice || '',
          thanks: d.thanksText ? parsePairLines(d.thanksText) : (Array.isArray(d.thanks) ? d.thanks : []),
          links: Array.isArray(d.links) ? d.links : [],
          linksTop: !!(d.linksTop || w.linksTop),
          shots: d.shotsText ? parseShotLines(d.shotsText) : (Array.isArray(d.shots) ? d.shots : []),
          body: typeof d.body === 'string' ? d.body : ''
        };
      });
    }).catch(function (err) {
      // 读不到就保持空列表，页面其余部分照常工作
      if (window.console && console.warn) console.warn('内容数据加载失败', err);
    });
  }

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 简介里允许画黄色下划线的 <span class="mark">，其余一律照旧转义 */
  /* 正文里的「黄底重点」简写：==这几个字==
     不写 HTML 也能用，渲染前统一换成站内的 <span class="mark">。 */
  function markShortcut(s) {
    return String(s == null ? '' : s).replace(/==([^=\n]+)==/g, '<span class="mark">$1</span>');
  }

  function plain(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, '');
  }

  function escMark(s) {
    var src = String(s == null ? '' : s);
    var OPEN = '\u0001';
    var CLOSE = '\u0002';
    return esc(
      src.split('<span class="mark">').join(OPEN).split('</span>').join(CLOSE)
    )
      .split(OPEN).join('<span class="mark">')
      .split(CLOSE).join('</span>');
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
      // 整张卡片都能点：里面不再放第二个链接，只铺一层透明链接
      return '' +
        '<article class="notice notice--' + esc(n.color || 'green') + (media ? ' has-media' : '') + '">' +
          '<div class="notice-date">' + dateBlock + '</div>' +
          media +
          '<div class="notice-body">' +
            '<h3>' +
              esc(n.title || '') +
              (n.pin ? ' <span class="tag tag--redstone">置顶</span>' : '') +
            '</h3>' +
            (excerpt ? '<p class="notice-excerpt">' + esc(excerpt) + '</p>' : '') +
            '<div class="notice-meta">' + tags +
              (href ? '<span class="notice-more">阅读全文 →</span>' : '') +
            '</div>' +
          '</div>' +
          (href ? '<a class="notice-hit" href="' + esc(href) + '" aria-label="阅读公告：' + esc(n.title || '') + '"></a>' : '') +
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
    var text = markShortcut(String(src == null ? '' : src))
      // 加粗的收尾星号前如果是标点、后面紧跟文字，CommonMark 不认这条加粗。
      // 把标点挪到星号外面，字一个不改，只是加粗范围少了一个标点。
      .replace(/\*\*([^*\n]+?)([：:，。、；！？])\*\*/g, '**$1**$2');
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
     地址形如 article.html?id=invest-open
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

    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: n.title,
      datePublished: n.date,
      dateModified: n.date,
      url: location.href,
      inLanguage: 'zh-CN',
      author: { '@type': 'Organization', name: '创想时代开发组', url: new URL('index.html', location.href).href },
      publisher: { '@type': 'Organization', name: '创想时代开发组' }
    });

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

    host.innerHTML =
      '<article class="article-sheet">' +
        '<div class="article-body">' + renderMarkdown(n.body) + '</div>' +
      '</article>' + navHtml;

    paintArticleSide(n);
  }

  /* 公告右栏：本条信息 + 相关公告 + 全部公告入口 */
  function paintArticleSide(n) {
    var side = $('#article-side');
    if (!side) return;

    var all = sortedNotices();
    var tags = n.tags || [];

    /* 先找同标签的，不够再用最新几条补齐 */
    var related = all.filter(function (x) {
      if (x.id === n.id) return false;
      return (x.tags || []).some(function (t) { return tags.indexOf(t) >= 0; });
    });
    if (related.length < 4) {
      all.forEach(function (x) {
        if (related.length >= 4 || x.id === n.id) return;
        if (related.indexOf(x) < 0) related.push(x);
      });
    }
    related = related.slice(0, 4);

    var d = String(n.date || '').split('-');
    var dateText = (d.length === 3 && d[0] && d[1] && d[2])
      ? (Number(d[0]) + ' 年 ' + Number(d[1]) + ' 月 ' + Number(d[2]) + ' 日')
      : (n.date || '');

    var facts = '<div><dt>发布日期</dt><dd>' + esc(dateText) + '</dd></div>';
    if (n.pin) facts += '<div><dt>状态</dt><dd>置顶</dd></div>';
    if (tags.length) {
      facts += '<div><dt>标签</dt><dd>' + tags.map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join(' ') + '</dd></div>';
    }

    side.innerHTML =
      '<div class="side-card">' +
        '<p class="side-card__k">本条信息</p>' +
        '<dl class="side-facts">' + facts + '</dl>' +
      '</div>' +
      '<div class="side-card">' +
        '<p class="side-card__k">相关公告</p>' +
        '<ul class="side-list">' + related.map(function (x, i) {
          return '<li><a href="article.html?id=' + esc(encodeURIComponent(x.id)) + '">' +
            '<i class="side-no">' + String(i + 1).padStart(2, '0') + '</i>' +
            '<span class="side-body">' +
              '<span class="side-date">' + esc(x.date || '') + '</span>' +
              '<b>' + esc(x.title) + '</b>' +
            '</span>' +
            '<span class="side-arrow" aria-hidden="true">→</span></a></li>';
        }).join('') + '</ul>' +
      '</div>' +
      '<div class="side-card side-card--flat">' +
        '<a class="side-all" href="news.html">' +
          '<span class="side-all__label">全部公告</span>' +
          '<span class="side-all__count">' + ANNOUNCEMENTS.length + ' 篇</span>' +
          '<span class="side-all__go" aria-hidden="true">→</span></a>' +
      '</div>';
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

      /* 连成一整条的标签（作品页那排）：底下垫一块黑色滑块，
         切到哪个就滑到哪个，滑块边缘把 1px 分割线「推」过去。 */
      var boxed = group.classList.contains('tabs--boxed');
      var ink = null;

      if (boxed) {
        ink = document.createElement('span');
        ink.className = 'tabs__ink';
        ink.setAttribute('aria-hidden', 'true');
        group.insertBefore(ink, group.firstChild);
      }

      function placeInk(tab) {
        if (!ink || !tab) return;
        ink.style.width = tab.offsetWidth + 'px';
        ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
      }

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

        placeInk(tab);

        // 手机端标签条会横向滚动：切到看不全的那一项时，把它带进可视区
        if (ink && group.scrollWidth > group.clientWidth + 4 && tab.scrollIntoView) {
          tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }

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

      // 首次：滑块先落到当前选中的标签上
      placeInk(tabs.filter(function (t) { return t.classList.contains('is-active'); })[0] || tabs[0]);

      window.addEventListener('resize', function () {
        placeInk(tabs.filter(function (t) { return t.classList.contains('is-active'); })[0]);
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
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function updateUi() {
      var icon = $('[data-theme-icon]');
      var label = $('[data-theme-label]');
      var btn = $('#theme-toggle');

      // 显示“将要切到的模式”，而不是当前模式
      var next = theme === 'dark' ? '浅色' : '深色';
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
      if (label) label.textContent = next;
      if (btn) btn.setAttribute('aria-label', '切换到' + next + '主题');
    }

    function commit() {
      root.setAttribute('data-theme', theme);
      updateUi();
    }

    clearTimeout(root._themeTimer);

    // 支持 View Transition 时，从切换按钮的位置向外扩散
    if (animate && !reduce && typeof document.startViewTransition === 'function') {
      var btn = $('#theme-toggle');
      var box = btn ? btn.getBoundingClientRect() : null;
      var x = box ? box.left + box.width / 2 : window.innerWidth - 80;
      var y = box ? box.top + box.height / 2 : 0;
      root.style.setProperty('--theme-x', Math.round(x) + 'px');
      root.style.setProperty('--theme-y', Math.round(y) + 'px');
      root.classList.add('theme-reveal');
      var vt;
      try { vt = document.startViewTransition(commit); } catch (e) { vt = null; }
      if (vt && vt.finished) {
        vt.finished.then(cleanup, cleanup);
        return;
      }
      root.classList.remove('theme-reveal');
      commit();
      return;
    }

    function cleanup() { root.classList.remove('theme-reveal'); }

    if (animate) {
      // 没有 View Transition 时就退回蒙版闪一下
      root.classList.add('theme-switching');
      root._themeTimer = setTimeout(function () {
        root.classList.remove('theme-switching');
      }, 400);
    } else {
      root.classList.remove('theme-switching');
    }

    commit();
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
        ? '<span class="work-more">查看详情 →</span>'
        : '';
      var ACCENTS = ['#5867d8', '#3f8f54', '#7b53a8', '#2f86b8', '#3d87f0'];
      var accent = ACCENTS[i % ACCENTS.length];
      var no = String(i + 1).padStart(2, '0');
      // 整块可点：一层透明链接铺满卡片，里面不再放第二个链接
      var hit = detailHref
        ? '<a class="work-hit" href="' + detailHref + '" aria-label="查看' + esc(it.title) + '"></a>'
        : '';
      return '' +
        '<article class="work" style="--band-accent:' + accent + '">' +
          '<div class="work-media">' +
            '<img src="' + esc(it.img) + '" alt="' + esc(it.title + (it.meta ? ' ' + it.meta : '')) + '" decoding="async">' +
            '<span class="work-deco" aria-hidden="true">' +
              '<span class="work-deco__no">' + no + '</span>' +
              '<span class="work-deco__code"></span>' +
            '</span>' +
          '</div>' +
          '<div class="work-body">' +
            '<h3>' + esc(it.title) + '</h3>' +
            (it.desc ? '<p>' + escMark(it.desc) + '</p>' : '') +
            '<div class="work-meta">' +
              (cat ? '<span class="tag tag--gold">' + esc(cat) + '</span>' : '') +
              (it.meta ? '<span>' + esc(it.meta) + '</span>' : '') +
              detail +
            '</div>' +
          '</div>' +
          hit +
        '</article>';
    }).join('');

    // 跨页共享元素过渡：卡片封面与详情页顶图用同一个过渡名，
    // 点进详情时封面会从卡片位置长过去。不支持的浏览器直接跳过。
    if (window.CSS && CSS.supports && CSS.supports('view-transition-name: none')) {
      Array.prototype.forEach.call(host.querySelectorAll('.work'), function (card) {
        var hit = card.querySelector('.work-hit');
        var media = card.querySelector('.work-media');
        if (!hit || !media) return;
        var m = /[?&]id=([^&]+)/.exec(hit.getAttribute('href') || '');
        if (!m) return;
        media.style.viewTransitionName = 'wv-' + m[1];
      });
    }
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
      var ACCENTS = ['#5867d8', '#3f8f54', '#7b53a8', '#2f86b8', '#3d87f0'];
      var accent = ACCENTS[i % ACCENTS.length];
      return '<a class="work-band" href="' + href + '" style="--band-accent:' + accent + '">' +
        '<span class="work-band__media"><img src="' + esc(it.img) + '" alt="' + esc(it.title) + '" decoding="async"></span>' +
        '<span class="work-band__body">' +
          '<span class="work-band__kicker">' + esc(kicker) + '</span>' +
          (it.en ? '<span class="work-band__en">' + it.en.split(' ').map(function (w, wi, arr) {
            return '<span' + (wi > 0 ? ' class="hd-out"' : '') + '>' + esc(w) + '</span>';
          }).join(' ') + '</span>' : '') +
          '<span class="work-band__title"><span class="mark">' + esc(it.title) + '</span><span class="work-band__badge">专题页</span></span>' +
          (it.desc ? '<span class="work-band__desc">' + escMark(it.desc) + '</span>' : '') +
          '<span class="work-band__actions">' +
            '<span class="work-band__go">查看详情 →</span>' +
            (it.plat ? '<span class="work-band__plat">' + esc(it.plat) + '</span>' : '') +
          '</span>' +
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
      // 正文外链用自己的一套「链接块」，和返回、换页那种小按钮区分开
      var btnClass = g.solid ? 'work-link work-link--solid' : 'work-link';
      var row = (g.items || []).map(function (it) {
        return '<a class="' + btnClass + '" href="' + esc(it.href) + '" ' +
          'target="_blank" rel="noopener">' + esc(it.label) + '</a>';
      }).join('');
      return '<div class="work-links__group">' + title +
        '<div class="work-links__row">' + row + '</div></div>';
    }).join('') + '</div>';
  }

  /* 截图：一行一条「图片路径 | 说明 | 分组名」，后两段可留空。 */
  function parseShotLines(text) {
    return String(text || '').split(/\r?\n/).map(function (line) {
      var t = line.trim();
      if (!t) return null;
      var parts = t.split(/\s*[|｜]\s*/);
      var img = (parts[0] || '').trim();
      if (!img) return null;
      return { img: img, alt: (parts[1] || '').trim(), group: (parts[2] || '').trim() };
    }).filter(Boolean);
  }

  /* 专题页正文：把 Markdown 折成原来那套块结构（段落 / 列表 / 单图 / 多图 / 引用），
     这样渲染器一行都不用改，排版自然不会变。 */
  function mdToRichBlocks(md) {
    var text = String(md == null ? '' : md).replace(/\r\n?/g, '\n');
    var out = [];
    var para = [];
    var list = [];
    var imgs = [];

    function flushPara() { if (para.length) { out.push(para.join('\n')); para = []; } }
    function flushList() { if (list.length) { out.push({ list: list.slice() }); list = []; } }
    function flushImgs() {
      if (!imgs.length) return;
      if (imgs.length > 1) out.push({ imgs: imgs.slice() });
      else out.push({ img: imgs[0].img, alt: imgs[0].alt });
      imgs = [];
    }

    text.split('\n').forEach(function (raw) {
      var t = raw.trim();
      if (!t) { flushList(); flushImgs(); flushPara(); return; }

      var li = /^-\s+(.+)$/.exec(t);
      if (li) { flushImgs(); flushPara(); list.push(markShortcut(li[1])); return; }

      var im = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(t);
      if (im) { flushList(); flushPara(); imgs.push({ img: im[2], alt: im[1] }); return; }

      var q = /^>\s+(.+)$/.exec(t);
      if (q) { flushList(); flushImgs(); flushPara(); out.push({ blockquote: q[1] }); return; }

      flushList(); flushImgs();
      para.push(markShortcut(t));
    });

    flushList(); flushImgs(); flushPara();
    return out;
  }

  /* 一行一条的文字表 → [{k, v}]。支持「项目 | 内容」或「项目：内容」。 */
  function parsePairLines(text) {
    return String(text || '').split(/\r?\n/).map(function (line) {
      var t = line.trim();
      if (!t) return null;
      var parts = t.split(/\s*[|｜]\s*/);
      if (parts.length < 2) {
        var m = /^([^：:]+)[：:]\s*(.+)$/.exec(t);
        if (m) return { k: m[1].trim(), v: m[2].trim() };
        // 实在看不出「项目 | 内容」就把整行当项目名，别让作者写的东西凭空消失
        return { k: t, v: '' };
      }
      return { k: parts[0].trim(), v: parts.slice(1).join(' | ').trim() };
    }).filter(Boolean);
  }

  /* 按钮：一行一条「挂在哪一节 | 分组 | 按钮文字 | 网址」。
     第一节可以留空（表示放页面最底部），分组留空就用「下载」。 */
  function parseLinkLines(text) {
    var bySection = { '': [] };   // key 是小节标题，'' 表示页面底部
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t) return;
      var parts = t.split(/\s*[|｜]\s*/);
      var urlMatch = /https?:\/\/[^\s|｜]+/.exec(t);
      if (parts.length < 2) {
        // 只写了一行「文字 https://…」也收下，不整行丢掉
        if (!urlMatch) return;
        var only = t.replace(urlMatch[0], '').replace(/[|｜]/g, '').trim();
        parts = ['', '', only || urlMatch[0], urlMatch[0]];
      }
      var section = '', group = '', label = '', href = '';
      if (parts.length >= 4) { section = parts[0].trim(); group = parts[1].trim(); label = parts[2].trim(); href = parts[3].trim(); }
      else if (parts.length === 3) { group = parts[0].trim(); label = parts[1].trim(); href = parts[2].trim(); }
      else { label = parts[0].trim(); href = parts[1].trim(); }
      if (!/^https?:\/\//.test(href) && urlMatch) href = urlMatch[0];
      if (!href) return;
      var key = section;
      if (!bySection[key]) bySection[key] = [];
      var bucket = bySection[key];
      var g = bucket.filter(function (x) { return x.title === group; })[0];
      if (!g) { g = { title: group, items: [] }; bucket.push(g); }
      g.items.push({ label: label || href, href: href });
    });
    return bySection;
  }

  /* 正文按「## 标题」切节；第一个标题之前的部分算导语。 */
  function splitSections(md) {
    var text = String(md == null ? '' : md).replace(/\r\n?/g, '\n');
    var lead = [];
    var sections = [];
    var cur = null;

    text.split('\n').forEach(function (line) {
      var m = /^##\s+(.+)$/.exec(line.trim());
      if (m) {
        cur = { title: m[1].trim(), lines: [] };
        sections.push(cur);
        return;
      }
      if (cur) cur.lines.push(line);
      else lead.push(line);
    });

    return {
      lead: lead.join('\n'),
      sections: sections.map(function (s) { return { title: s.title, body: s.lines.join('\n') }; })
    };
  }

  /* 专题页数据 → 老渲染器认识的形状 */
  function topicToWork(p) {
    var intro = [];
    var facts = [];
    var topLinks = [];
    var bottomLinks = [];

    function pushLinks(html) { if (html) intro.push({ links: html }); }

    if (typeof p.body === 'string' && p.body.trim()) {
      /* 扁平格式：一段 Markdown 正文，## 分节，按钮写在一行一条的 linksText 里 */
      var split = splitSections(p.body);
      if (split.lead.trim()) intro = intro.concat(mdToRichBlocks(split.lead));
      facts = parsePairLines(p.factsText);

      var bySection = parseLinkLines(p.linksText);
      bottomLinks = bySection[''] || [];

      split.sections.forEach(function (sec) {
        intro.push({ heading: sec.title });
        if (sec.body.trim()) intro = intro.concat(mdToRichBlocks(sec.body));
        var groups = bySection[sec.title];
        if (groups && groups.length) intro.push({ links: groups });
      });
    } else {
      /* 旧格式（嵌套)：仍然兼容，方便回退 */
      if (p.lead) intro = intro.concat(mdToRichBlocks(p.lead));
      (p.sections || []).forEach(function (sec) {
        if (!sec || !sec.title) return;
        intro.push({ heading: sec.title });
        if (sec.body) intro = intro.concat(mdToRichBlocks(sec.body));
        if (Array.isArray(sec.links) && sec.links.length) intro.push({ links: sec.links });
      });
      facts = Array.isArray(p.facts) ? p.facts : [];
      bottomLinks = Array.isArray(p.links) ? p.links : [];
    }

    return {
      name: p.name,
      type: p.type || '',
      displayEn: p.displayEn || '',
      tagline: p.tagline || '',
      author: p.author || '',
      cover: p.cover || '',
      coverAlt: p.coverAlt || '',
      facts: facts,
      links: bottomLinks,
      linksTop: !!p.linksTop,
      intro: intro
    };
  }

  /* 把详情正文（Markdown）渲染成和原来同一套结构：
     段落 / 小标题 / 列表 / 单图 / 连续多图（图组）。 */
  /* 作品正文里的行内格式：**加粗** 与 [文字](链接)。
     正文其余部分仍然按纯文本处理，避免把 Markdown 全盘解析后版式跑掉。 */
  function inlineWorkMd(s) {
    var html = escMark(markShortcut(s));
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (m, text, href) {
      var target = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + href + '"' + target + '>' + text + '</a>';
    });
    return html;
  }

  function renderWorkBody(md) {
    var text = String(md == null ? '' : md).replace(/\r\n?/g, '\n');
    if (!text.trim()) return '';

    var out = [];
    var list = [];
    var imgs = [];

    function flushList() {
      if (!list.length) return;
      out.push('<ul class="work-list">' + list.map(function (it) {
        return '<li>' + inlineWorkMd(it) + '</li>';
      }).join('') + '</ul>');
      list = [];
    }

    function flushImgs() {
      if (!imgs.length) return;
      var figs = imgs.map(function (im) {
        return '<figure class="work-figure">' +
          '<img src="' + esc(im.src) + '" alt="' + esc(im.alt || '') + '" loading="lazy" decoding="async">' +
        '</figure>';
      });
      out.push(imgs.length > 1 ? '<div class="work-figure-grid">' + figs.join('') + '</div>' : figs[0]);
      imgs = [];
    }

    text.split('\n').forEach(function (raw) {
      var t = raw.trim();
      if (!t) { flushList(); flushImgs(); return; }

      var h = /^##\s+(.+)$/.exec(t);
      if (h) { flushList(); flushImgs(); out.push('<h3 class="work-heading">' + escMark(markShortcut(h[1])) + '</h3>'); return; }

      var li = /^-\s+(.+)$/.exec(t);
      if (li) { flushImgs(); list.push(li[1]); return; }

      var im = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(t);
      if (im) { flushList(); imgs.push({ alt: im[1], src: im[2] }); return; }

      flushList(); flushImgs();
      out.push('<p>' + inlineWorkMd(t) + '</p>');
    });

    flushList(); flushImgs();
    return out.join('');
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

    var work = WORK_DETAILS[id] || WORKS[id];
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
    var tagEl = $('#work-tagline');
    if (tagEl) tagEl.innerHTML = escMark(work.tagline || '');
    setText('#work-author', work.author ? '作者：' + work.author : '');
    // 面包屑最后一级也要跟着换，否则一直停在 HTML 里写死的那个作品名
    setText('#work-crumb', work.name || '');
    if (work.name) document.title = work.name + ' | 作品 | 创想时代开发组';

    var desc = $('meta[name="description"]');
    if (desc) {
      desc.setAttribute('content',
        work.name + (work.author ? '（作者 ' + work.author + '）' : '') + '：' +
        plain(work.tagline || '') + ' —— 创想时代开发组作品展示。');
    }

    // 头图
    // 封面：没有 cover 就把整块留空，绝不退回别的作品的图
    var cover = $('#work-cover');
    var coverFigure = $('#work-cover-figure');
    if (cover && coverFigure && work.cover) {
      // 和列表页卡片封面同名，才有共享元素过渡
      if (id && window.CSS && CSS.supports && CSS.supports('view-transition-name: none')) {
        cover.style.viewTransitionName = 'wv-' + id;
      }
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
      if (work.body && work.body.trim()) {
        parts.push(renderWorkBody(work.body));
      } else if (work.intro && work.intro.length) {
        parts.push(work.intro.map(function (p) {
          // 纯字符串 = 一段正文（正文里允许 <span class="mark"> 画下划线）
          if (typeof p === 'string') return '<p>' + escMark(p) + '</p>';
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
              return '<li>' + escMark(it) + '</li>';
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
    var selfId = work.id || id;
    var isSiteWork = SHOWCASE_HOME.some(function (it) { return it.id === selfId; });
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
    var ids = Object.keys(WORK_DETAILS).concat(
      Object.keys(WORKS).filter(function (k) { return !WORK_DETAILS[k]; })
    );
    if (ids.length > 1) {
      var idx = ids.indexOf(id);
      if (idx < 0) idx = 0;
      var prevId = ids[(idx - 1 + ids.length) % ids.length];
      var nextId = ids[(idx + 1) % ids.length];
      var prev = WORK_DETAILS[prevId] || WORKS[prevId];
      var next = WORK_DETAILS[nextId] || WORKS[nextId];
      var nav = $('#work-nav');
      if (nav) {
        nav.hidden = false;
        nav.innerHTML =
          '<a class="btn btn--ghost btn--sm" href="work.html?id=' + esc(prevId) + '">← ' + esc(prev.name) + '</a>' +
          '<a class="btn btn--ghost btn--sm" href="work.html?id=' + esc(nextId) + '">' + esc(next.name) + ' →</a>';
      }
    }

    // 分享与结构化数据（分享放在页面右上角）
    mountShare(work.name);
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: work.name,
      author: work.author ? { '@type': 'Person', name: work.author } : undefined,
      description: plainText(work.tagline || ''),
      image: work.cover ? new URL(work.cover, location.href).href : undefined,
      url: location.href,
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'CollectionPage', name: '创想时代开发组 作品展示', url: new URL('works.html', location.href).href }
    });

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

    /* 手机上左右滑动切换：位移超过 40px 且横向多于纵向才算。
       两个灯箱入口都会挂监听，这里用 dataset 保证只挂一次，避免一次滑动翻两张。 */
    (function () {
      if (box.dataset.swipeReady === '1') return;
      box.dataset.swipeReady = '1';
      var startX = 0, startY = 0, tracking = false;
      box.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { tracking = false; return; }
        tracking = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });

      box.addEventListener('touchend', function (e) {
        if (!tracking) return;
        tracking = false;
        var t = e.changedTouches[0];
        if (!t) return;
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        if (typeof step === 'function') step(dx < 0 ? 1 : -1);
      }, { passive: true });
    })();

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
    /* 同一个 #lightbox，滑动监听共用上面那套开关 */
    (function () {
      if (box.dataset.swipeReady === '1') return;
      box.dataset.swipeReady = '1';
      var startX = 0, startY = 0, tracking = false;
      box.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { tracking = false; return; }
        tracking = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (!tracking) return;
        tracking = false;
        var t = e.changedTouches[0];
        if (!t) return;
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        step(dx < 0 ? 1 : -1);
      }, { passive: true });
    })();

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

    // 所有索引入口都平滑滚动；目标在隐藏的标签页里时先切过去
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('.page-index__row') : null;
      if (!a) return;

      var panelId = a.getAttribute('data-tab');
      var panel = panelId ? document.getElementById(panelId) : null;
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;

      e.preventDefault();

      if (panel && panel.hidden) {
        var tab = document.querySelector('.tabs .tab[aria-controls="' + panelId + '"]');
        if (tab) tab.click();
      }

      var y = target.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });

    // 当前所在区块高亮
    var links = Array.prototype.slice.call(host.querySelectorAll('.page-index__row'));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    function spy() {
      var line = window.pageYOffset + 160;
      var active = 0;
      sections.forEach(function (sec, i) {
        if (!sec) return;
        var top = sec.getBoundingClientRect().top + window.pageYOffset;
        if (top <= line) active = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });
    }

    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy, { passive: true });
    if ('onscrollend' in window) window.addEventListener('scrollend', spy);
    spy();
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

    var work = TOPIC_WORK[id] || WORKS[id];
    if (!work) {
      var first = Object.keys(TOPIC_WORK)[0] || Object.keys(WORKS)[0];
      work = TOPIC_WORK[first] || WORKS[first];
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
    var rwTag = $('#rw-tagline');
    if (rwTag) rwTag.innerHTML = escMark(work.tagline || '');
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
      if (typeof b === 'string') return '<p>' + escMark(b) + '</p>';

      if (b.list) {
        return '<ul class="feature-list">' + b.list.map(function (li) {
          return '<li>' + escMark(li) + '</li>';
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
            '<span class="ms-head__no">' + String(idx).padStart(2, '0') + '</span>' +
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

    /* 上一件 / 下一件：按系列作品专题页的排列顺序走 */
    var bandList = (SHOWCASE_HOME || []).filter(function (x) { return x && x.href && x.title; });
    var at = -1;
    bandList.forEach(function (x, i) { if (x.id === id) at = i; });
    if (at >= 0 && bandList.length > 1) {
      var prevW = bandList[(at - 1 + bandList.length) % bandList.length];
      var nextW = bandList[(at + 1) % bandList.length];
      var pager = document.createElement('section');
      pager.className = 'section section--tight';
      pager.innerHTML = '<div class="wrap"><nav class="work-pager" aria-label="作品翻页">' +
        '<a class="work-pager__link" href="' + esc(prevW.href) + '">' +
          '<span class="work-pager__dir">← 上一件</span>' +
          '<span class="work-pager__name">' + esc(prevW.title) + '</span></a>' +
        '<a class="work-pager__link work-pager__link--next" href="' + esc(nextW.href) + '">' +
          '<span class="work-pager__dir">下一件 →</span>' +
          '<span class="work-pager__name">' + esc(nextW.title) + '</span></a>' +
        '</nav></div>';
      host.appendChild(pager);
    }

    mountShare(work.name);
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: work.name,
      author: work.author ? { '@type': 'Person', name: work.author } : undefined,
      description: plainText(work.tagline || ''),
      image: work.cover ? new URL(work.cover, location.href).href : undefined,
      url: location.href,
      inLanguage: 'zh-CN'
    });
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

  /* ---------- 访问量统计 ----------
     只在 SITE_CONFIG.analytics 里开了才加载外部脚本，关掉就完全不发请求。 */
  function initAnalytics() {
    var cfg = (SITE_CONFIG && SITE_CONFIG.analytics) || {};
    var loaded = false;

    function script(src) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      document.head.appendChild(s);
      return s;
    }

    /* 不蒜子：页脚显示累计访问与访客数 */
    if (cfg.busuanzi) {
      var bar = document.querySelector('.footer-bottom');
      if (bar) {
        var box = document.createElement('span');
        box.className = 'footer-stats';
        box.innerHTML =
          '<span id="busuanzi_container_site_pv">访问 <b id="busuanzi_value_site_pv">—</b> 次</span>' +
          '<span id="busuanzi_container_site_uv">访客 <b id="busuanzi_value_site_uv">—</b> 人</span>';
        bar.appendChild(box);
      }
      script('https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js');
      loaded = true;
    }

    /* 百度统计：填了站点 ID 才上报 */
    if (cfg.baiduId) {
      window._hmt = window._hmt || [];
      script('https://hm.baidu.com/hm.js?' + encodeURIComponent(cfg.baiduId));
      loaded = true;
    }

    return loaded;
  }


  /* ---------- 站内搜索 ----------
     索引在浏览器里现拼：页面清单 + WORKS + SHOWCASE_HOME + SHOWCASE + ANNOUNCEMENTS。
     不生成额外文件，也不花一次请求，改完内容搜索自动跟着变。 */
  var SEARCH_PAGES = [
    { t: '首页', u: 'index.html', k: '页面 首页 团队 简介 数据 公告 加入 联系' },
    { t: '作品展示', u: 'works.html', k: '页面 作品 列表 代表作品 测试 专题页' },
    { t: '公告', u: 'news.html', k: '页面 公告 新闻 更新 通知' },
    { t: '工具箱', u: 'tools.html', k: '页面 工具 图片 视频 格式转换 打包器' },
    { t: '图片处理工具', u: 'tools-image.html', k: '工具 压缩 图片 分辨率 格式 转换' },
    { t: '视频处理工具', u: 'tools-video.html', k: '工具 视频 转码 投稿 规格 录屏' },
    { t: '格式转换工具', u: 'tools-convert.html', k: '工具 转换 mp3 wav pdf word json csv base64' },
    { t: '打包合规性检测和转换工具', u: 'tools-pack.html', k: '工具 投稿 压缩包 zip 7z 规范 命名 检测 打包 合规 转换' },
    { t: 'MCBE 打包器', u: 'tools-mcbe.html', k: '工具 打包 apk 安卓 mcbe' },
    { t: '材质对比工具 matoga', u: 'tools-matoga.html', k: '工具 材质 对比 matoga 芝世' },
    { t: '加入我们', u: 'join.html', k: '加入 招募 审核 部门 报名 问卷 联系' },
    { t: '关于我们', u: 'about.html', k: '关于 团队 历史 成员 宗旨 部门' },
    { t: '赛博撸猫', u: 'cat.html', k: '撸猫 彩蛋 猫 威廉 喵喵喵' },
    { t: '柑柠档案', u: 'ganning.html', k: '柑柠 档案 作品 海报 设计 渲染' },
    { t: '梦海旅者', u: 'mengsea.html', k: '梦海旅者 地图 专题 幻世编年史' },
    { t: '创想之都', u: 'city.html', k: '创想之都 城市 地图 专题' },
    { t: '创想之都 · 介绍', u: 'city-intro.html', k: '创想之都 介绍 背景' },
    { t: '创想之都 · 地图', u: 'city-maps.html', k: '创想之都 地图 轨道交通 卫星图' },
    { t: '创想之都 · 图集', u: 'city-gallery.html', k: '创想之都 图集 截图' },
    { t: '创想之都 · 公告', u: 'city-news.html', k: '创想之都 公告 停建' },
    { t: '创想之都 · 参与与下载', u: 'city-join.html', k: '创想之都 参与 下载 加入' }
  ];

  function plainText(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]*>/g, ' ')
      .replace(/[#*`>|\-]{1,}/g, ' ');
  }

  function buildSearchIndex() {
    var out = SEARCH_PAGES.map(function (p) {
      return { title: p.t, url: p.u, kind: '页面', text: p.k || '' };
    });

    // 作品详情（WORKS）
    Object.keys(WORKS || {}).forEach(function (id) {
      var w = WORKS[id];
      if (!w) return;
      var href = w.rich || /^work-rich/.test(w.href || '') ? 'work-rich.html?id=' + id : 'work.html?id=' + id;
      // 专题页走 work-rich，普通详情走 work.html：用 SHOWCASE_HOME 判断不准，这里按 href 优先
      if (w.href) href = w.href;
      else if (SHOWCASE_HOME && SHOWCASE_HOME.some(function (x) { return x.id === id && x.href; })) {
        href = SHOWCASE_HOME.filter(function (x) { return x.id === id; })[0].href;
      }
      out.push({
        title: w.name || id,
        url: href,
        kind: '作品',
        text: [w.author, w.type, plainText(w.tagline)].filter(Boolean).join(' ')
      });
    });

    // 系列作品专题页的横幅（可能没进 WORKS）
    (SHOWCASE_HOME || []).forEach(function (x) {
      if (!x || !x.title) return;
      out.push({
        title: x.title,
        url: x.href || ('work.html?id=' + x.id),
        kind: '专题页',
        text: [x.en, x.meta, x.desc].filter(Boolean).join(' ')
      });
    });

    // 代表作品 / 测试组件（没进 WORKS 的那些）
    [].concat(SHOWCASE || [], SHOWCASE_TEST || []).forEach(function (x) {
      if (!x || !x.title) return;
      out.push({
        title: x.title,
        url: x.href || ('work.html?id=' + x.id),
        kind: '作品',
        text: [x.meta, x.desc].filter(Boolean).join(' ')
      });
    });

    // 公告
    (ANNOUNCEMENTS || []).forEach(function (a) {
      if (!a || !a.title) return;
      out.push({
        title: a.title,
        url: 'article.html?id=' + a.id,
        kind: '公告',
        text: [a.date, (a.tags || []).join(' '), plainText(a.body).slice(0, 600)].filter(Boolean).join(' ')
      });
    });

    // 同一件作品可能同时出现在 WORKS 与 SHOWCASE_HOME 里，按「标题 + 地址」去重
    var seen = {};
    return out.filter(function (it) {
      var key = it.title + '|' + it.url;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function initSearch() {
    var bar = document.querySelector('.site-header .bar');
    var slot = document.querySelector('[data-search-slot]');
    if (!bar && !slot) return;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'search-open';
    trigger.setAttribute('aria-label', '搜索站内内容');
    trigger.setAttribute('title', '搜索（快捷键 /）');
    trigger.innerHTML = '<span class="search-open__ico" aria-hidden="true">⌕</span><span class="search-open__label">搜索</span>';
    if (bar) {
      var anchor = bar.querySelector('.theme-toggle');
      bar.insertBefore(trigger, anchor || null);
    } else {
      trigger.classList.add('search-open--inline');
      slot.appendChild(trigger);
    }

    var modal = document.createElement('div');
    modal.className = 'search-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="search-modal__veil" data-search-close></div>' +
      '<div class="search-modal__panel" role="dialog" aria-modal="true" aria-label="站内搜索">' +
        '<div class="search-modal__bar">' +
          '<span class="search-modal__ico" aria-hidden="true">⌕</span>' +
          '<input id="search-input" class="search-modal__input" type="search" ' +
            'placeholder="搜作品、公告、页面…" autocomplete="off" aria-label="搜索关键词">' +
          '<button type="button" class="search-modal__close" data-search-close aria-label="关闭搜索">×</button>' +
        '</div>' +
        '<div class="search-results" id="search-results"></div>' +
        '<p class="search-hint">↑↓ 选择 · 回车打开 · Esc 关闭</p>' +
      '</div>';
    document.body.appendChild(modal);

    var input = modal.querySelector('#search-input');
    var results = modal.querySelector('#search-results');
    var index = null;
    var active = -1;
    var lastFocus = null;

    function open() {
      if (!index) index = buildSearchIndex();
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.documentElement.classList.add('is-searching');
      input.value = '';
      render('');
      setTimeout(function () { input.focus(); }, 20);
    }

    function close() {
      modal.hidden = true;
      document.documentElement.classList.remove('is-searching');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    /* 把命中的词在标题里标黄 */
    function highlight(text, terms) {
      var html = esc(text);
      terms.forEach(function (t) {
        if (!t) return;
        var safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\    function render(q) {');
        html = html.replace(new RegExp('(' + safe + ')', 'gi'), '<mark class="search-hit__hl">$1</mark>');
      });
      return html;
    }

    /* 首页与空态都能点的常用入口 */
    function hotList(label) {
      var picks = [
        { t: '无人区跑酷', u: 'work-rich.html?id=uransch' },
        { t: '梦海旅者', u: 'mengsea.html' },
        { t: '全部作品', u: 'works.html' },
        { t: '最新公告', u: 'news.html' },
        { t: '加入我们', u: 'join.html' }
      ];
      return '<p class="search-hint search-hint--inline">' + esc(label) + '</p>' +
        '<div class="search-hot">' + picks.map(function (p) {
          return '<a class="search-hot__item" href="' + esc(p.u) + '">' + esc(p.t) + '</a>';
        }).join('') + '</div>';
    }

    function render(q) {
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      active = -1;
      if (!terms.length) {
        results.innerHTML = hotList('试试这几个');
        return;
      }
      var hits = index.filter(function (it) {
        var hay = (it.title + ' ' + it.text).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) >= 0; });
      }).sort(function (a, b) {
        var at = a.title.toLowerCase().indexOf(terms[0]) >= 0 ? 0 : 1;
        var bt = b.title.toLowerCase().indexOf(terms[0]) >= 0 ? 0 : 1;
        return at - bt;
      }).slice(0, 12);

      if (!hits.length) {
        results.innerHTML = '<p class="search-empty">没找到「' + esc(q) + '」</p>' + hotList('也可能是想找这些');
        return;
      }

      results.innerHTML = hits.map(function (it, i) {
        return '<a class="search-hit" href="' + esc(it.url) + '" data-i="' + i + '">' +
          '<span class="search-hit__kind">' + esc(it.kind) + '</span>' +
          '<span class="search-hit__title">' + highlight(it.title, terms) + '</span>' +
        '</a>';
      }).join('');
    }

    function move(dir) {
      var items = results.querySelectorAll('.search-hit');
      if (!items.length) return;
      active = (active + dir + items.length) % items.length;
      items.forEach(function (el, i) { el.classList.toggle('is-active', i === active); });
      items[active].scrollIntoView({ block: 'nearest' });
    }

    trigger.addEventListener('click', open);
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-search-close]')) close();
    });
    input.addEventListener('input', function () { render(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        var items = results.querySelectorAll('.search-hit');
        var pick = active >= 0 ? items[active] : items[0];
        if (pick) { location.href = pick.getAttribute('href'); }
      }
    });
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (e.key === 'Escape' && !modal.hidden) { close(); return; }
      if (!modal.hidden) return;
      if (e.key === '/' && !typing) { e.preventDefault(); open(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    });
  }

  /* ---------- 分享 ----------
     平时只露一个按钮，点开才展开三个选项，右上角那行才不占地方。 */
  function addShareRow(host, title) {
    if (!host) return;
    var url = location.href;
    var t = title || document.title;

    var row = document.createElement('div');
    row.className = 'share-row';
    var canSystemShare = !!(navigator.share && navigator.canShare ? true : navigator.share);
    var items =
      '<span class="share-menu__items">' +
        '<button type="button" class="share-menu__item" role="menuitem" data-share-copy>复制链接</button>' +
        '<button type="button" class="share-menu__item" role="menuitem" data-share-text>复制标题和链接</button>' +
        '<button type="button" class="share-menu__item" role="menuitem" data-share-qr>二维码</button>' +
        (canSystemShare
          ? '<button type="button" class="share-menu__item" role="menuitem" data-share-sys>用其他应用分享…</button>'
          : '') +
      '</span>' +
      '<div class="share-qr" hidden></div>';

    row.innerHTML =
      '<span class="share">' +
        '<button type="button" class="share-btn share-trigger" aria-haspopup="true" aria-expanded="false">' +
          '<span class="share-trigger__ico" aria-hidden="true">↗</span> 分享' +
        '</button>' +
        '<span class="share-menu" role="menu" hidden>' + items + '</span>' +
      '</span>';
    host.appendChild(row);

    var cfg = (SITE_CONFIG && SITE_CONFIG.analytics) || {};
    if (cfg.busuanzi) {
      var seen = document.createElement('span');
      seen.className = 'share-row__views';
      seen.id = 'busuanzi_container_page_pv';
      seen.innerHTML = '本页浏览 <b id="busuanzi_value_page_pv">—</b> 次';
      row.appendChild(seen);
    }

    var wrap = row.querySelector('.share');
    var trigger = row.querySelector('.share-trigger');
    var menu = row.querySelector('.share-menu');

    function shut() {
      menu.hidden = true;
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      var box = row.querySelector('.share-qr');
      var list = row.querySelector('.share-menu__items');
      if (box && list) { box.hidden = true; box.innerHTML = ''; list.hidden = false; }
    }

    function toggle() {
      var open = menu.hidden;
      if (!open) { shut(); return; }
      menu.hidden = false;
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      var first = menu.querySelector('.share-menu__item');
      if (first) first.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    document.addEventListener('click', function (e) {
      if (!menu.hidden && !wrap.contains(e.target)) shut();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        shut();
        trigger.focus();
      }
    });

    /* 二维码：点了才去加载 assets/vendor/qrcode.js，平时不下载 */
    var qrBtn = row.querySelector('[data-share-qr]');
    var qrBox = row.querySelector('.share-qr');
    var itemsWrap = row.querySelector('.share-menu__items');

    function qrLoaded() { return typeof window.qrcode === 'function'; }

    function showQr() {
      if (!qrBox || !itemsWrap) return;
      itemsWrap.hidden = true;
      qrBox.hidden = false;
      qrBox.innerHTML = '<p class="share-qr__tip">正在生成…</p>';

      var draw = function () {
        try {
          var qr = window.qrcode(0, 'M');
          qr.addData(url, 'Byte');
          qr.make();
          qrBox.innerHTML =
            '<div class="share-qr__img">' + qr.createSvgTag({ scalable: true, margin: 2 }) + '</div>' +
            '<p class="share-qr__tip">扫码打开本页</p>' +
            '<button type="button" class="share-qr__back">返回</button>';
          qrBox.querySelector('.share-qr__back').addEventListener('click', function (e) {
            e.stopPropagation();
            qrBox.hidden = true;
            itemsWrap.hidden = false;
          });
        } catch (err) {
          qrBox.innerHTML = '<p class="share-qr__tip">二维码生成失败，换个浏览器试试</p>';
        }
      };

      if (qrLoaded()) { draw(); return; }

      var s = document.createElement('script');
      s.src = 'assets/vendor/qrcode.js';
      s.onload = draw;
      s.onerror = function () {
        qrBox.innerHTML = '<p class="share-qr__tip">二维码脚本加载失败，检查网络后重试</p>';
      };
      document.head.appendChild(s);
    }

    if (qrBtn) qrBtn.addEventListener('click', function (e) { e.stopPropagation(); showQr(); });

    var copyTextBtn = row.querySelector('[data-share-text]');
    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', function () {
        var text = t + '\n' + url;
        var done = function () {
          copyTextBtn.textContent = '已复制';
          setTimeout(function () {
            copyTextBtn.textContent = '复制标题和链接';
            shut();
          }, 900);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
          done();
        }
      });
    }

    var sysBtn = row.querySelector('[data-share-sys]');
    if (sysBtn && navigator.share) {
      sysBtn.addEventListener('click', function () {
        navigator.share({ title: t, text: t, url: url }).then(shut, function () {});
      });
    }

    var copyBtn = row.querySelector('[data-share-copy]');
    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.textContent = '已复制';
        setTimeout(function () {
          copyBtn.textContent = '复制链接';
          shut();
        }, 900);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });

    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setTimeout(shut, 120); });
    });
  }

  /* 详情页的分享放在「返回」那一行的右端（页面右上角）；
     没有那一行时退回页面顶部的内容区。 */
  function mountShare(title) {
    var back = document.querySelector('.work-back');
    if (back) {
      back.classList.add('work-back--share');
      addShareRow(back, title);
      return;
    }
    var top = document.querySelector('.article-meta') || document.querySelector('.page-head') || document.querySelector('main .wrap');
    if (top) addShareRow(top, title);
  }



  /* 首页最下面放一个站点级分享 */
  function initHomeShare() {
    if (document.body.getAttribute('data-page') !== 'home') return;
    if (document.querySelector('.share-home')) return;
    var main = document.querySelector('main');
    if (!main) return;

    var box = document.createElement('section');
    box.className = 'section section--tight share-home';
    box.innerHTML = '<div class="wrap share-home__inner"></div>';
    main.appendChild(box);

    addShareRow(box.querySelector('.share-home__inner'), document.title.split('|')[0].trim() || '创想时代开发组');

    // 首页这条是站点级分享，不挂「本页浏览」，免得抢眼
    var views = box.querySelector('.share-row__views');
    if (views) views.remove();
  }

  /* 作品类页面兜底：只要带「返回」那一行又没有分享，就补一个。
     覆盖梦海旅者、创想之都各页这类手写页面（work.html / work-rich.html 各自已经挂过了）。 */
  function initDetailShare() {
    if (document.querySelector('.share-row')) return;
    if (document.body.getAttribute('data-page') !== 'works') return;
    var back = document.querySelector('.work-back');
    if (!back) return;

    var h1 = document.querySelector('h1');
    var title = (h1 && h1.textContent.trim()) || document.title.split('|')[0].trim();
    if (!title) return;

    mountShare(title);
  }

  /* ---------- 结构化数据 ----------
     让搜索引擎知道这页是什么，而不是只看到一堆 HTML。 */
  function injectJsonLd(obj) {
    if (!obj) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  /* ---------- PWA ---------- */
  function initPwa() {
    if (!('serviceWorker' in navigator)) return;
    var local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if (location.protocol !== 'https:' && !local) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }


  /* ---------- 滚动进场 ----------
     只给「首屏看不到的大块」加淡入上移，避免长页一屏一屏地刷出来太花。
     元素标签也是这里加的：脚本没跑起来就完全不会隐藏任何内容。 */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = $$('.section-head, .showcase > *, .work-band, .topic-band, .panel, .work-pager, .ms-shots, .officer');

    targets.forEach(function (el, i) {
      if (el.closest('.hero')) return;
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--reveal-delay', (i % 4) * 60 + 'ms');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    targets.forEach(function (el) { io.observe(el); });
  }



  /* 顶部导航的悬停面板：只放站内真实存在的页面，不放新写的介绍文字。
     键名对应导航链接的 data-nav。 */
  var NAV_MENUS = {
    home: [
      { title: '首页', links: [
        { t: '系列作品专题页', h: 'index.html#online' },
        { t: '代表作品', h: 'index.html#showcase' },
        { t: '测试中作品', h: 'index.html#testing' },
        { t: '工具箱', h: 'index.html#tools' },
        { t: '其他页面', h: 'index.html#more' }
      ] },
      { title: '关于', links: [
        { t: '我们是谁', h: 'index.html#intro' },
        { t: '我们做什么', h: 'index.html#what-we-do' },
        { t: '开放代投业务', h: 'index.html#invest' },
        { t: '最新公告', h: 'index.html#latest-news' }
      ] },
      { title: '页尾', links: [
        { t: '想一起做点东西？', h: 'index.html#join-cta' }
      ] }
    ],
    news: [
      { title: '近期公告', links: [
        { t: '代投业务与入室审核条例', h: 'article.html?id=invest-open' },
        { t: '二级域名对全体成员开放', h: 'article.html?id=subdomain-open' },
        { t: '官网开放', h: 'article.html?id=site-launch' }
      ] },
      { title: '相关', links: [
        { t: '加入我们', h: 'join.html' },
        { t: '关于我们', h: 'about.html' }
      ] }
    ],
    tools: [
      { title: '常用工具', links: [
        { t: '图片处理', h: 'tools-image.html' },
        { t: '视频处理', h: 'tools-video.html' },
        { t: '格式转换', h: 'tools-convert.html' },
        { t: '打包合规性检测和转换工具', h: 'tools-pack.html' }
      ] },
      { title: '组员作品', links: [
        { t: 'matoga 材质贴图对比', h: 'tools-matoga.html' },
        { t: 'MCBE 打包器', h: 'tools-mcbe.html' }
      ] },
      { title: '相关', links: [
        { t: '作品主页', h: 'works.html' },
        { t: '全部公告', h: 'news.html' }
      ] }
    ],
    join: [
      { title: '加入我们', links: [
        { t: '报名加入', h: 'join.html#panel-form' },
        { t: '代投与投稿', h: 'join.html#panel-invest' },
        { t: '联系方式', h: 'join.html#panel-contact' },
        { t: '入室审核条例', h: 'join.html#panel-rules' }
      ] }
    ],
    about: [
      { title: '关于', links: [
        { t: '关于我们', h: 'about.html' },
        { t: '赛博撸猫', h: 'cat.html' }
      ] }
    ]
  };

  /* 面板里的大号入口：目前只有工具箱用得上 */
  var NAV_ALL = {
    tools: { t: '全部工具', h: 'tools.html' },
    news: { t: '全部公告', h: 'news.html' }
  };

  /* 面板底部那条快捷行：都是站内真实入口 */
  var NAV_QUICK = [
    { t: '首页', h: 'index.html' },
    { t: '公告', h: 'news.html' },
    { t: '工具箱', h: 'tools.html' },
    { t: '加入我们', h: 'join.html' },
    { t: '关于我们', h: 'about.html' }
  ];

  /* 悬停展开、离开收起；键盘 Tab 到链接也会展开。只在宽屏启用。 */
  function initNavMenus() {
    var header = document.querySelector('.site-header');
    var nav = document.querySelector('.nav');
    if (!header || !nav || !window.matchMedia) return;
    var wide = window.matchMedia('(min-width: 1000px)');

    var panel = document.createElement('div');
    panel.className = 'nav-mega';
    panel.id = 'nav-mega';
    panel.setAttribute('aria-hidden', 'true');
    header.appendChild(panel);


    var links = Array.prototype.slice.call(nav.querySelectorAll('a[data-nav]'));
    var openKey = null;
    var timer = null;

    function build(key) {
      var cols = NAV_MENUS[key];
      if (!cols) return '';
      return '<div class="nav-mega__inner">' +
          cols.map(function (col) {
            return '<div class="nav-mega__col">' +
              '<p class="nav-mega__title">' + esc(col.title) + '</p>' +
              col.links.map(function (l) {
                return '<a class="nav-mega__link" href="' + esc(l.h) + '">' + esc(l.t) + '</a>';
              }).join('') +
            '</div>';
          }).join('') +
        '</div>' +
        (NAV_ALL[key]
          ? '<a class="nav-mega__all" href="' + esc(NAV_ALL[key].h) + '">' +
              esc(NAV_ALL[key].t) + '<span aria-hidden="true">→</span></a>'
          : '') +
        '<div class="nav-mega__quick">' +
          NAV_QUICK.map(function (l) {
            return '<a class="nav-mega__quicklink" href="' + esc(l.h) + '">' + esc(l.t) + '</a>';
          }).join('') +
          '<button type="button" class="nav-mega__search" data-mega-search>搜索站内内容</button>' +
        '</div>';
    }

    function place() {
      var r = header.getBoundingClientRect();
      panel.style.top = Math.round(r.bottom) + 'px';
    }

    function open(key) {
      if (!wide.matches) return;
      if (!NAV_MENUS[key]) return;
      clearTimeout(timer);
      if (openKey !== key) {
        panel.innerHTML = build(key);
        openKey = key;
      }
      place();
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nav-open');
      links.forEach(function (a) {
        a.classList.toggle('is-open', a.getAttribute('data-nav') === key);
      });
    }

    function close(delay) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('nav-open');
        links.forEach(function (a) { a.classList.remove('is-open'); });
        openKey = null;
      }, delay || 120);
    }

    links.forEach(function (a) {
      var key = a.getAttribute('data-nav');
      a.addEventListener('pointerenter', function () { open(key); });
      a.addEventListener('focus', function () { open(key); });
      a.addEventListener('pointerleave', function () { close(160); });
      a.addEventListener('blur', function () { close(160); });
    });

    panel.addEventListener('click', function (e) {
      // 同一页里的锚点：平滑滚过去，不重新加载
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a) {
        var u = new URL(a.href, location.href);
        if (u.pathname === location.pathname && u.hash) {
          var target = document.querySelector(u.hash);
          if (target) {
            e.preventDefault();
            close(0);
            var y = target.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            history.replaceState(null, '', u.hash);
            return;
          }
        }
      }

      var btn = e.target && e.target.closest ? e.target.closest('[data-mega-search]') : null;
      if (btn) {
        e.preventDefault();
        close(0);
        var opener = document.querySelector('.search-open');
        if (opener) opener.click();
      }
    });

    panel.addEventListener('pointerenter', function () { clearTimeout(timer); });
    panel.addEventListener('pointerleave', function () { close(120); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(0);
    });
    document.addEventListener('click', function (e) {
      if (!header.contains(e.target)) close(0);
    });
    wide.addEventListener('change', function () { if (!wide.matches) close(0); });
  }

  /* ---------- 图片加载态 ----------
     还没解码完的图先给一层呼吸底色，加载完淡入；懒加载和新插进来的图也算上。 */
  function initImageStates() {
    var mark = function (img) {
      if (!img || img.tagName !== 'IMG') return;
      if (img.classList.contains('img-loaded')) return;
      if (img.complete && img.naturalWidth > 0) {
        img.classList.remove('img-waiting');
        img.classList.add('img-loaded');
        return;
      }
      img.classList.add('img-waiting');
      img.addEventListener('load', function () {
        img.classList.remove('img-waiting');
        img.classList.add('img-loaded');
      }, { once: true });
      img.addEventListener('error', function () {
        img.classList.remove('img-waiting');
        img.classList.add('img-loaded');
      }, { once: true });
    };

    $$('img').forEach(mark);

    // 后面 JS 渲染出来的图（作品卡、专题页正文、截图）也要接上
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (records) {
        records.forEach(function (r) {
          Array.prototype.forEach.call(r.addedNodes, function (node) {
            if (!node || node.nodeType !== 1) return;
            if (node.tagName === 'IMG') mark(node);
            else if (node.querySelectorAll) node.querySelectorAll('img').forEach(mark);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

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

  /* ---------- 首屏数字：进视口时从 0 滚到目标值 ----------
     只处理「数字开头 + 后缀」的项（2016 / 5000 万+ / 80+），
     带汉字前缀的「近 10 年」「TOP 20」原样不动，绝不改文案。 */
  function initStatCount() {
    var stats = $$('.hero-stats .stat b');
    if (!stats.length) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced && reduced.matches) return;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    stats.forEach(function (el) {
      var original = el.textContent;
      var m = /^(\d{2,})(\D*)$/.exec(original);
      if (!m) return;

      var target = parseInt(m[1], 10);
      var suffix = m[2];
      var done = false;

      function run() {
        if (done) return;
        done = true;
        var start = 0;
        var dur = 1200;
        el.textContent = '0' + suffix;
        function step(now) {
          if (!start) start = now;
          var p = Math.min(1, (now - start) / dur);
          el.textContent = Math.round(easeOut(p) * target) + suffix;
          if (p < 1) {
            window.requestAnimationFrame(step);
          } else {
            el.textContent = original;   // 收尾回到原文，格式一定一致
          }
        }
        window.requestAnimationFrame(step);
      }

      if (!('IntersectionObserver' in window)) { run(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.disconnect();
          run();
        });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    // 公告是外部数据，先读完再渲染，避免列表空一帧
    loadContent().then(start, start);
  }

  function start() {
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
    initDetailShare();
    initNavMenus();
    initHomeShare();
    initImageStates();
    initZoomGallery();
    initAnchorToc();
    initAnalytics();
    initSearch();
    initReveal();
    initPwa();
    initBackToTop();
    initCyberCat();
    initPageTransition();
    initPageIndex();
    initArticle();
    initStatCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
