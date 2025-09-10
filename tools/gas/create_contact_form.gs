/**
 * Google Apps Script: お問い合わせフォーム（楽曲制作・取材等のご相談）自動作成
 * - 仕様通りの設問、必須、検証、確認メッセージを設定
 * - 実行後、ログに公開URL・編集URL・埋め込みURLを出力
 * - テーマ（色・フォント）はフォームUIから手動設定が必要（GAS API未対応）
 */

function createContactForm() {
  const SPEC = {
    title: 'お問い合わせフォーム（楽曲制作・取材等のご相談）',
    description: [
      '楽曲制作、雑誌・Webメディア取材などに関するご相談を承ります。制作のご依頼の際は、',
      '企画内容・スケジュール・ご予算をお知らせください。',
      '※映像制作のご相談は現在受付を停止しております。内容によっては返信できない場合があります。',
      '個人情報はご連絡手段としてのみ使用いたします。',
    ].join('\n'),
    confirmation: [
      'お問い合わせありがとうございます。内容を確認後、折り返しご連絡いたします。',
      'お急ぎ、または数日経っても返信がない場合は、恐れ入りますがメールにて再度ご連絡ください。',
    ].join('\n'),
    privacy: [
      '個人情報はご連絡手段としてのみ使用いたします。送信内容は社内で必要な範囲で共有されます。',
      '詳細なポリシーはウェブサイトのプライバシーポリシーをご確認ください。',
    ].join('\n'),
  };

  const form = FormApp.create(SPEC.title);
  form.setDescription(SPEC.description);
  form.setConfirmationMessage(SPEC.confirmation);
  form.setCollectEmail(false);
  form.setProgressBar(false);
  form.setShuffleQuestions(false);
  form.setAllowResponseEdits(false);
  form.setRequireLogin(false); // 外部からの回答を許可
  form.setLimitOneResponsePerUser(false);

  // お名前（必須／短文）
  form.addTextItem()
    .setTitle('お名前')
    .setHelpText('ニックネーム可。ご担当者名でも構いません。')
    .setRequired(true);

  // メールアドレス（必須／短文／メール形式検証）
  const emailItem = form.addTextItem()
    .setTitle('メールアドレス')
    .setHelpText('返信用のメールアドレスをご記入ください。')
    .setRequired(true);
  const emailValidation = FormApp.createTextValidation()
    .requireTextIsEmailAddress()
    .setHelpText('メールアドレス形式で入力してください。')
    .build();
  emailItem.setValidation(emailValidation);

  // お問い合わせ種別（必須／ラジオ）
  const typeItem = form.addMultipleChoiceItem()
    .setTitle('お問い合わせ種別')
    .setRequired(true);
  typeItem.setChoices([
    typeItem.createChoice('楽曲制作のご依頼'),
    typeItem.createChoice('雑誌／Webメディアの取材依頼'),
    typeItem.createChoice('その他のお問い合わせ'),
  ]);

  // 企画内容／ご相談内容（必須／段落）
  form.addParagraphTextItem()
    .setTitle('企画内容／ご相談内容')
    .setHelpText('制作依頼：用途（例：配信用BGM／主題歌など）、イメージ（ジャンル・雰囲気・参考曲）、提供物（歌入り／インスト／尺）など。取材依頼：媒体名、企画趣旨、掲載予定日など。')
    .setRequired(true);

  // スケジュール（任意／段落）
  form.addParagraphTextItem()
    .setTitle('スケジュール（納期・取材予定日など)')
    .setHelpText('わかる範囲でご記入ください。')
    .setRequired(false);

  // ご予算（任意／短文）
  form.addTextItem()
    .setTitle('ご予算（目安）')
    .setHelpText('例）5万円〜10万円、応相談 など')
    .setRequired(false);

  // その他・連絡事項（任意／段落）
  form.addParagraphTextItem()
    .setTitle('その他・連絡事項')
    .setHelpText('共有したいURLや補足事項があればご記入ください。')
    .setRequired(false);

  // 注意事項への同意（必須／チェックボックス）
  const consentItem = form.addCheckboxItem()
    .setTitle('注意事項への同意')
    .setRequired(true);
  consentItem.setChoices([
    consentItem.createChoice('映像制作のご相談は受付停止中であること、内容によっては返信できない場合があることに同意します'),
  ]);

  // プライバシー案内（セクション見出し）
  form.addSectionHeaderItem()
    .setTitle('個人情報の取り扱いについて')
    .setHelpText(SPEC.privacy);

  // URLをログ出力
  const published = form.getPublishedUrl(); // /viewform
  const edit = form.getEditUrl();
  const embed = published + '?embedded=true';
  Logger.log('Published URL: ' + published);
  Logger.log('Edit URL: ' + edit);
  Logger.log('Embed URL: ' + embed);

  // 返り値（スクリプトエディタの実行結果にも表示されます）
  return { published, edit, embed };
}

/**
 * 既存フォームを指定IDで上書き再生成したい場合のユーティリティ。
 * 既存項目を削除後、最新仕様で再作成します（破壊的）。
 */
function rebuildContactForm(formId) {
  const form = FormApp.openById(formId);
  // 既存項目を削除
  const items = form.getItems();
  for (var i = items.length - 1; i >= 0; i--) {
    form.deleteItem(items[i]);
  }
  // 設定を再適用
  form.setTitle('お問い合わせフォーム（楽曲制作・取材等のご相談）');
  form.setDescription('楽曲制作、雑誌・Webメディア取材などに関するご相談を承ります。制作のご依頼の際は、\n企画内容・スケジュール・ご予算をお知らせください。\n※映像制作のご相談は現在受付を停止しております。内容によっては返信できない場合があります。\n個人情報はご連絡手段としてのみ使用いたします。');
  form.setConfirmationMessage('お問い合わせありがとうございます。内容を確認後、折り返しご連絡いたします。\nお急ぎ、または数日経っても返信がない場合は、恐れ入りますがメールにて再度ご連絡ください。');
  form.setCollectEmail(false);
  form.setProgressBar(false);
  form.setShuffleQuestions(false);
  form.setAllowResponseEdits(false);
  form.setRequireLogin(false);
  form.setLimitOneResponsePerUser(false);

  // 以下は createContactForm と同じ順に再作成
  form.addTextItem().setTitle('お名前').setHelpText('ニックネーム可。ご担当者名でも構いません。').setRequired(true);
  const emailItem = form.addTextItem().setTitle('メールアドレス').setHelpText('返信用のメールアドレスをご記入ください。').setRequired(true);
  const emailValidation = FormApp.createTextValidation().requireTextIsEmailAddress().setHelpText('メールアドレス形式で入力してください。').build();
  emailItem.setValidation(emailValidation);
  const typeItem = form.addMultipleChoiceItem().setTitle('お問い合わせ種別').setRequired(true);
  typeItem.setChoices([
    typeItem.createChoice('楽曲制作のご依頼'),
    typeItem.createChoice('雑誌／Webメディアの取材依頼'),
    typeItem.createChoice('その他のお問い合わせ'),
  ]);
  form.addParagraphTextItem().setTitle('企画内容／ご相談内容').setHelpText('制作依頼：用途（例：配信用BGM／主題歌など）、イメージ（ジャンル・雰囲気・参考曲）、提供物（歌入り／インスト／尺）など。取材依頼：媒体名、企画趣旨、掲載予定日など。').setRequired(true);
  form.addParagraphTextItem().setTitle('スケジュール（納期・取材予定日など)').setHelpText('わかる範囲でご記入ください。').setRequired(false);
  form.addTextItem().setTitle('ご予算（目安）').setHelpText('例）5万円〜10万円、応相談 など').setRequired(false);
  form.addParagraphTextItem().setTitle('その他・連絡事項').setHelpText('共有したいURLや補足事項があればご記入ください。').setRequired(false);
  const consentItem = form.addCheckboxItem().setTitle('注意事項への同意').setRequired(true);
  consentItem.setChoices([consentItem.createChoice('映像制作のご相談は受付停止中であること、内容によっては返信できない場合があることに同意します')]);
  form.addSectionHeaderItem().setTitle('個人情報の取り扱いについて').setHelpText('個人情報はご連絡手段としてのみ使用いたします。送信内容は社内で必要な範囲で共有されます。\n詳細なポリシーはウェブサイトのプライバシーポリシーをご確認ください。');

  const published = form.getPublishedUrl();
  const embed = published + '?embedded=true';
  Logger.log('Rebuilt. Published URL: ' + published);
  Logger.log('Embed URL: ' + embed);
  return { published, embed };
}

