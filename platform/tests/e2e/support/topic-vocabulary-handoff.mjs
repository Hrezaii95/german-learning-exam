import {expect} from '@playwright/test';

/** Topic workshops retain their URL while vocabulary moves to the subject sheet. */
export async function verifyTopicVocabularyHandoff(page,{subject,lessons,label=subject}){
 const workshopUrl=page.url();
 const link=page.getByRole('link',{name:`Open ${label} subject sheet →`,exact:true});
 const target=new URL(await link.getAttribute('href'),workshopUrl);
 expect(target.pathname.endsWith(`/cheat-sheets/subjects/${subject}`)).toBe(true);
 expect(target.searchParams.get('lesson')).toBe(lessons.join(','));
 await link.click();
 await expect.poll(()=>new URL(page.url()).searchParams.get('lesson')).toBe(lessons.join(','));
 await expect(page.locator('[data-subject-entry]').first()).toBeVisible();
 await page.goBack();
 await expect(page).toHaveURL(workshopUrl);
}
