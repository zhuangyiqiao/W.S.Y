// Presentation only: hiding a panel never unmounts its audio controls or state.
export class MobilePanels {
  constructor(nav, panels, media = matchMedia('(max-width: 760px)')) {
    this.nav = nav; this.panels = panels; this.media = media; this.selected = 'music';
    this.buttons = [...nav.querySelectorAll('[data-mobile-panel]')];
    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-mobile-panel]');
      if (button) this.select(button.dataset.mobilePanel);
    });
    media.addEventListener('change', () => this.render());
    this.render();
  }
  select(id) {
    if (!this.panels[id]) return;
    this.selected = id; this.render();
  }
  render() {
    if (!this.media.matches && this.buttons.includes(document.activeElement)) {
      this.panels[this.selected].focus?.({preventScroll:true});
    }
    this.nav.hidden = !this.media.matches;
    for (const [id,panel] of Object.entries(this.panels)) {
      const hide = this.media.matches && id !== this.selected;
      if (hide && panel.contains(document.activeElement)) {
        this.buttons.find(button=>button.dataset.mobilePanel === this.selected)?.focus({preventScroll:true});
      }
      panel.hidden = hide;
    }
    for (const button of this.buttons) button.setAttribute('aria-pressed',String(button.dataset.mobilePanel === this.selected));
  }
}
