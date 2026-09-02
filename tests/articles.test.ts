import assert from 'node:assert/strict';
import test from 'node:test';
import { ARTICLES, articleCtaUrl } from '../lib/articles.ts';

function words(article: (typeof ARTICLES)[number]) {
  return [...article.intro, ...article.sections.flatMap(section => [...section.paragraphs, ...(section.bullets || [])]), ...article.faq.flatMap(item => [item.question, item.answer])].join(' ').split(/\s+/).length;
}

test('cluster editorial tem cinco URLs únicas e conteúdo substancial', () => {
  assert.equal(ARTICLES.length, 5);
  assert.equal(new Set(ARTICLES.map(article => article.slug)).size, 5);
  for (const article of ARTICLES) {
    assert.ok(words(article) >= 700, `${article.slug} precisa de conteúdo editorial substancial`);
    assert.ok(article.faq.length >= 3);
    assert.ok(article.relatedSlugs.length >= 3);
  }
});

test('CTA editorial preserva atribuição orgânica por artigo', () => {
  const url = articleCtaUrl('mapa-astral-2026');
  assert.match(url, /utm_source=organic/);
  assert.match(url, /utm_medium=article/);
  assert.match(url, /utm_content=mapa-astral-2026/);
});
