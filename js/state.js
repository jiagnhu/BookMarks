// Global state and keys. Pure data holders used across modules.
export const state = {
  page: new URLSearchParams(location.search).get('page') === 'B' ? 'B' : 'A',
  user: null,
  linkIdxEditing: null,
  skinImage: null,
  quotas: { normal: 3 },
};

// LocalStorage/session keys used by the app
export const KEYS = {
  title: p => `bm_${p}_title`,
  motto: p => `bm_${p}_motto`,
  links: p => `bm_${p}_links`,
  skin: p => `bm_skin_img`,
  roleUsage: r => `bm_role_${r}_used`,
  loginPwd: `bm_login_pwd`,
  bPwd: `bm_B_pwd`,
  bAuthed: `bm_B_authed_session`,
  user: `bm_user`,
  ui: {
    boardAlpha: 'bm_ui_board_alpha',
    cardAlpha: 'bm_ui_card_alpha',
    vignette: 'bm_ui_vignette',
    showcase: 'bm_ui_showcase_w',
    contrast: 'bm_ui_contrast',
  },
};

export const DEFAULT_TITLE = 'My BookMarks';
export const DEFAULT_MOTTO = '简洁 · 可编辑 · 可离线加载';

