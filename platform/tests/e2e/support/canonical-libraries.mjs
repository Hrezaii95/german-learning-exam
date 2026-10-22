import {expect} from '@playwright/test';

/** Subject entries disclose the lesson/source tags previously shown on hub cards. */
export async function expectVocabularyTags(page,labels){
 const entries=page.locator('[data-subject-entry]');
 await expect(entries.first()).toBeVisible();
 const count=await entries.count();
 for(let index=0;index<count;index++){
  const entry=entries.nth(index);
  if(await entry.getAttribute('aria-expanded')!=='true')await entry.click();
  await expect(entry).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('.subject-word-dropdown')).toHaveAttribute('id',await entry.getAttribute('aria-controls'));
  const tags=page.locator('.subject-word-dropdown .study-tag-list');
  for(const label of labels)await expect(tags).toContainText(label);
 }
 return count;
}

/** Read every bounded results page; conjugation details stay opt-in. */
export async function readCoursePatternPages(page,{expand=false}={}){
 const result=[],seen=new Set();
 for(let index=0;index<100;index++){
  const url=page.url();
  if(seen.has(url))throw Error('Library pagination repeated a page');
  seen.add(url);
  const patterns=page.locator('[data-course-pattern]');
  await expect(page.locator('#hub-results-heading')).toBeVisible();
  expect(await page.locator('.hub-results').last().locator(':scope > article').count()).toBeLessThanOrEqual(12);
  if(expand)for(const pattern of await patterns.all()){
   const details=pattern.locator('details').first();
   if(await details.count()){
    if(await details.getAttribute('open')===null)await details.locator('summary').click();
    await expect(details.locator(':scope > :not(summary)').first()).toBeVisible();
   }
  }
  result.push(...await patterns.evaluateAll(elements=>elements.map(element=>({
   id:element.getAttribute('data-course-pattern'),
   lesson:Number(/^Lesson (\d+)/.exec(element.querySelector('.study-eyebrow')?.textContent??'')?.[1]),
   text:element.textContent,
  }))));
  const next=page.getByRole('link',{name:'Next page →',exact:true});
  if(!await next.count()){
   expect(new Set(result.map(entry=>entry.id)).size).toBe(result.length);
   return result;
  }
  const target=new URL(await next.getAttribute('href'),url);
  await next.click();
  await expect(page.locator('.library-pagination [role="status"]')).toContainText(`Page ${target.searchParams.get('page')} of`);
 }
 throw Error('Library pagination exceeded its page budget');
}
