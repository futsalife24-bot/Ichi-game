export class GrowthControls {
  constructor({ getContext, onAssist }) {
    this.getContext = getContext;
    this.onAssist = onAssist;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './src/growth-controls.css';
    document.head.append(link);

    this.root = document.createElement('section');
    this.root.id = 'growthControls';
    this.root.setAttribute('aria-label', 'いどうの おてつだい');
    this.root.hidden = true;

    this.friendButton = document.createElement('button');
    this.friendButton.type = 'button';
    this.friendButton.textContent = '🐥 おともだちへ';
    this.friendButton.setAttribute('aria-label', 'おともだちへ ぱっと いどう');
    this.friendButton.onclick = () => this.assist('friend');

    this.itemButton = document.createElement('button');
    this.itemButton.type = 'button';
    this.itemButton.textContent = '✨ つぎの ものへ';
    this.itemButton.setAttribute('aria-label', 'つぎの ものへ ぱっと いどう');
    this.itemButton.onclick = () => this.assist('item');

    this.root.append(this.friendButton, this.itemButton);
    document.body.append(this.root);
  }

  update() {
    const context = this.getContext();
    const show = context?.island === 1 && Boolean(context.canShow);
    this.friendButton.hidden = !show || !context.hasFriend;
    this.itemButton.hidden = !show || !context.hasItem;
    this.root.hidden = this.friendButton.hidden && this.itemButton.hidden;
  }

  assist(kind) {
    const context = this.getContext();
    if (context?.island !== 1 || !context.canShow) return false;
    if (kind === 'friend' && !context.hasFriend) return false;
    if (kind === 'item' && !context.hasItem) return false;
    if (kind !== 'friend' && kind !== 'item') return false;
    this.onAssist(kind);
    return true;
  }
}
