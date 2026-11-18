// CREATOR WORKSPACE - Push notification registration
// VAPID public key only. Never put the private key here.
(() => {
  'use strict';

  const VAPID_PUBLIC_KEY =
    'BGE6Q7qz5cNvkitcmy4exQcmyDH2yeTnh-qSRhlLt5gp5gAL7cAPSaDudKzMJSOu1hBQQV6XjrSwpq4T-h7K2Ik';

  function decodeKey(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const raw = atob(padded);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)) {
      throw new Error(
        'この環境ではWeb Pushを利用できません。iPhoneのホーム画面からアプリを開いてください。'
      );
    }

    if (typeof db === 'undefined' || !db) {
      throw new Error('Supabaseの初期化が完了していません。');
    }

    const { data: userData, error: userError } =
      await db.auth.getUser();

    if (userError || !userData?.user) {
      throw new Error('CREATOR WORKSPACEにログインしてください。');
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error('通知が許可されていません。');
    }

    const registration = await navigator.serviceWorker.ready;

    let subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(VAPID_PUBLIC_KEY)
      });
    }

    const details = subscription.toJSON();

    if (!details.endpoint ||
        !details.keys?.p256dh ||
        !details.keys?.auth) {
      throw new Error('通知先の情報を取得できませんでした。');
    }

    const { error } = await db
      .from('push_subscriptions')
      .upsert({
        user_id: userData.user.id,
        endpoint: details.endpoint,
        p256dh: details.keys.p256dh,
        auth_key: details.keys.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) throw error;

    return true;
  }

  function addNotificationButton() {
    if (document.getElementById('cw-enable-push')) return;

    const button = document.createElement('button');
    button.id = 'cw-enable-push';
    button.type = 'button';
    button.textContent = '通知を有効にする';

    Object.assign(button.style, {
      position: 'fixed',
      right: '14px',
      bottom: '18px',
      zIndex: '9999',
      padding: '11px 16px',
      borderRadius: '12px',
      border: '1px solid #999',
      background: '#171717',
      color: '#f1f1f1',
      fontSize: '13px',
      fontWeight: '600',
      boxShadow: '0 3px 12px #0005'
    });

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = '設定中…';

      try {
        await enablePush();
        button.textContent = '通知登録済み';
        alert('通知先を登録しました。送信機能の設定後に通知を受信できます。');
      } catch (error) {
        button.textContent = '通知を有効にする';
        alert('通知設定エラー: ' + (error.message || error));
      } finally {
        button.disabled = false;
      }
    });

    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addNotificationButton);
  } else {
    addNotificationButton();
  }

  window.CreatorWorkspacePush = { enablePush };
})();
