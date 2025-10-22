// DOM helpers and commonly used element getters
export const qs = (s, p = document) => p.querySelector(s);
export const qsa = (s, p = document) => Array.from(p.querySelectorAll(s));

// Centralized element references to avoid repeated queries
export const els = {
  brandWrap: null, brandText: null, brandEditBtn: null, brandPanel: null,
  brandInput: null, brandCancel: null, brandSave: null,
  mottoWrap: null, mottoText: null, mottoEditBtn: null, mottoPanel: null,
  mottoInput: null, mottoCancel: null, mottoSave: null,
  swUpdateBanner: null, swUpdateApply: null, swUpdateDismiss: null,
  colLeft: null, colRight: null, pageTag: null, btnSetBPass: null,
  linkDlg: null, loginDlg: null, registerDlg: null, changeDlg: null,
  bpassDlg: null, askBDlg: null,
  avatar: null, btnLoginTop: null, btnSettings: null, btnOpenRegister: null,
  drawer: null, drawerMask: null, btnCloseDrawer: null, btnAdaptLight: null,
  skinUpload: null, btnApplySkin: null, presetSkins: null, customSkins: null,
  customSkinsList: null, skinQuotaHint: null,
  btnLogout: null, btnChangePwd: null,
  accountUsername: null,
  rngBoard: null, valBoard: null, rngCard: null, valCard: null,
  rngVig: null, valVig: null, rngShow: null, valShow: null,
};

export function bindElements() {
  els.brandWrap = qs('.brand.editable');
  els.brandText = qs('#brandText');
  els.brandEditBtn = qs('#editBrand');
  els.brandPanel = qs('#brandEditPanel');
  els.brandInput = qs('#brandInput');
  els.brandCancel = qs('#brandCancel');
  els.brandSave = qs('#brandSave');

  els.mottoWrap = qs('.subtitle.editable');
  els.mottoText = qs('#subtitleText');
  els.mottoEditBtn = qs('#editSubtitle');
  els.mottoPanel = qs('#subtitleEditPanel');
  els.mottoInput = qs('#subtitleInput');
  els.mottoCancel = qs('#subtitleCancel');
  els.mottoSave = qs('#subtitleSave');

  els.swUpdateBanner = qs('#swUpdate');
  els.swUpdateApply = qs('#swUpdateApply');
  els.swUpdateDismiss = qs('#swUpdateDismiss');

  els.colLeft = qs('#colLeft');
  els.colRight = qs('#colRight');
  els.pageTag = qs('#pageTag');
  els.btnSetBPass = qs('#btnSetBPass');
  els.linkDlg = qs('#dlgLink');
  els.loginDlg = qs('#dlgLogin');
  els.registerDlg = qs('#dlgRegister');
  els.changeDlg = qs('#dlgChangePwd');
  els.bpassDlg = qs('#dlgBPass');
  els.askBDlg = qs('#dlgAskB');

  els.avatar = qs('#avatar');
  els.btnLoginTop = qs('#btnLoginTop');
  els.btnSettings = qs('#btnSettings');
  els.btnOpenRegister = qs('#btnOpenRegister');

  els.drawer = qs('#drawer');
  els.drawerMask = qs('#drawerMask');
  els.btnCloseDrawer = qs('#btnCloseDrawer');
  els.btnAdaptLight = qs('#btnAdaptLight');

  els.skinUpload = qs('#skinUpload');
  els.btnApplySkin = qs('#btnApplySkin');
  els.presetSkins = qs('#presetSkins');
  els.customSkins = qs('#customSkins');
  els.customSkinsList = qs('#customSkinsList');
  els.skinQuotaHint = qs('#skinQuotaHint');

  els.btnLogout = qs('#btnLogout');
  els.btnChangePwd = qs('#btnChangePwd');
  els.accountUsername = qs('#accountUsername');

  els.rngBoard = qs('#rngBoard');
  els.valBoard = qs('#valBoard');
  els.rngCard = qs('#rngCard');
  els.valCard = qs('#valCard');
  els.rngVig = qs('#rngVignette');
  els.valVig = qs('#valVignette');
  els.rngShow = qs('#rngShowcase');
  els.valShow = qs('#valShowcase');
}
