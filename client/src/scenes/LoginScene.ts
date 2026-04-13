import Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

type Mode = 'login' | 'register';

export class LoginScene extends Phaser.Scene {
  private mode: Mode = 'login';
  private usernameInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private formDiv!: HTMLDivElement;

  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 80, 'FORTRESS FANTASY', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildForm(width, height);
  }

  private buildForm(width: number, height: number) {
    // HTML form — Phaser'ın input sistemi mobilde güvenilmez
    this.formDiv = document.createElement('div');
    Object.assign(this.formDiv.style, {
      position:  'absolute',
      top:       `${height * 0.25}px`,
      left:      '50%',
      transform: 'translateX(-50%)',
      display:   'flex',
      flexDirection: 'column',
      gap:       '12px',
      width:     '280px',
      zIndex:    '10',
    });

    this.usernameInput = this.makeInput('Kullanıcı adı', 'text');
    this.passwordInput = this.makeInput('Şifre', 'password');

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'GİRİŞ YAP';
    Object.assign(submitBtn.style, {
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: '#4466cc',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Hesap yok mu? Kayıt ol';
    Object.assign(toggleBtn.style, {
      padding: '8px',
      fontSize: '13px',
      background: 'transparent',
      color: '#aaaaff',
      border: '1px solid #aaaaff',
      borderRadius: '6px',
      cursor: 'pointer',
    });

    const msgEl = document.createElement('div');
    Object.assign(msgEl.style, {
      color: '#ff6666',
      fontSize: '13px',
      textAlign: 'center',
      minHeight: '18px',
    });

    submitBtn.onclick = async () => {
      const u = this.usernameInput.value.trim();
      const p = this.passwordInput.value;

      if (!u || !p) { msgEl.textContent = 'Kullanıcı adı ve şifre gerekli'; return; }

      submitBtn.disabled = true;
      submitBtn.textContent = '...';
      msgEl.textContent = '';

      const result = this.mode === 'login'
        ? await NetworkManager.login(u, p)
        : await NetworkManager.register(u, p);

      submitBtn.disabled = false;
      submitBtn.textContent = this.mode === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL';

      if (result.ok) {
        this.cleanup();
        this.scene.start('MenuScene');
      } else {
        msgEl.textContent = result.msg;
      }
    };

    toggleBtn.onclick = () => {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      submitBtn.textContent = this.mode === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL';
      toggleBtn.textContent = this.mode === 'login'
        ? 'Hesap yok mu? Kayıt ol'
        : 'Zaten hesabın var mı? Giriş yap';
    };

    this.formDiv.append(this.usernameInput, this.passwordInput, submitBtn, toggleBtn, msgEl);
    document.body.appendChild(this.formDiv);

    // Sahne kapanınca formu temizle
    this.events.once('shutdown', () => this.cleanup());
  }

  private makeInput(placeholder: string, type: string): HTMLInputElement {
    const el = document.createElement('input');
    el.type        = type;
    el.placeholder = placeholder;
    Object.assign(el.style, {
      padding:      '10px',
      fontSize:     '15px',
      borderRadius: '6px',
      border:       '1px solid #555',
      background:   '#1a1a2e',
      color:        '#ffffff',
      outline:      'none',
    });
    return el;
  }

  private cleanup() {
    this.formDiv?.remove();
  }
}
