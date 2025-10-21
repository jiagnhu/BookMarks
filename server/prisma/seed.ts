import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Public settings
  const hasSettings = await prisma.publicSettings.findFirst();
  if (!hasSettings) {
    await prisma.publicSettings.create({ data: {
      boardAlpha: 55, cardAlpha: 55, vignette: 25, showcaseWidth: 28, contrast: false, skinUrl: '/images/p1.jpeg'
    }});
  }

  // Public pages A/B with idempotent seeding to ensure 20 slots
  for (const code of ['A','B'] as const) {
    let page = await prisma.publicPage.findFirst({ where: { code } as any });
    if (!page) {
      page = await prisma.publicPage.create({ data: { code, title: code==='A' ? 'My BookMarks' : 'My BookMarks · B', motto: '简洁 · 可编辑 · 可离线加载' } });
    }
    const presets = [
      { name: '官网', url: 'https://example.com' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Bing', url: 'https://www.bing.com' },
      { name: 'Baidu', url: 'https://www.baidu.com' },
      { name: '掘金', url: 'https://juejin.cn' },
      { name: '知乎', url: 'https://www.zhihu.com' },
    ];
    const total = 20;
    // 读取现有书签
    const existing = await prisma.publicBookmark.findMany({ where: { pageId: page.id }, orderBy: { orderIndex: 'asc' } });
    const byIndex = new Map(existing.map(b => [b.orderIndex, b] as const));
    for (let i = 0; i < total; i++) {
      const has = byIndex.get(i);
      if (!has) {
        // 不存在则创建：前6个用预设，其余为空
        const p = i < presets.length ? presets[i] : { name: `链接 ${i+1}`, url: '' };
        await prisma.publicBookmark.create({ data: { pageId: page.id, orderIndex: i, name: p.name, url: p.url } });
      } else if (i < presets.length && (!has.name || !has.url)) {
        // 已存在但为空的前6项，补齐为预设（不覆盖已有非空内容）
        const p = presets[i];
        if (!has.name || !has.url) {
          await prisma.publicBookmark.update({ where: { id: has.id }, data: { name: has.name || p.name, url: has.url || p.url } });
        }
      }
    }
  }
}

main().then(()=>prisma.$disconnect()).catch(async e=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
