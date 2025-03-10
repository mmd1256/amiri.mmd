class SmartPaymentForm {
    constructor() {
        this.initializeVariables();
        this.setupEventListeners();
        this.startCountdown();
        this.setupFormValidation();
    }

    initializeVariables() {
        // المان‌های اصلی
        this.form = document.getElementById('smartPaymentForm');
        this.cardWrapper = document.querySelector('.card-wrapper');
        this.sections = document.querySelectorAll('.form-section');
        this.progressFill = document.querySelector('.progress-fill');
        this.steps = document.querySelectorAll('.step');

        // المان‌های کارت
        this.cardSegments = Array.from({ length: 4 }, (_, i) => 
            document.getElementById(`seg${i + 1}`));
        this.cardNumberPreviews = Array.from({ length: 4 }, (_, i) => 
            document.getElementById(`cardNumber${i + 1}`));

        // المان‌های فرم
        this.formElements = {
            cardHolder: document.getElementById('cardHolder'),
            month: document.getElementById('month'),
            year: document.getElementById('year'),
            cvv: document.getElementById('cvv'),
            cardHolderPreview: document.getElementById('cardHolderPreview'),
            expiryPreview: document.getElementById('cardExpiryPreview'),
            cvvPreview: document.getElementById('cvvPreview'),
            confirmCardNumber: document.getElementById('confirmCardNumber'),
            confirmCardHolder: document.getElementById('confirmCardHolder'),
            toggleCvv: document.querySelector('.toggle-cvv')
        };

        // تنظیمات
        this.config = {
            timeoutDuration: 600, // 10 دقیقه
            minCardHolderLength: 3,
            maxCVVLength: 4,
            processingDelay: 2000,
            validMonths: Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')),
            currentYear: new Date().getFullYear() % 100
        };

        // اطلاعات بانک‌ها
        this.banks = {
            '603799': { name: 'بانک ملی ایران', logo: 'melli-logo.png', cvvLength: 4 },
            '589210': { name: 'بانک سپه', logo: 'sepah-logo.png', cvvLength: 3 },
            '627353': { name: 'بانک تجارت', logo: 'tejarat-logo.png', cvvLength: 3 },
            '603770': { name: 'بانک کشاورزی', logo: 'keshavarzi-logo.png', cvvLength: 3 },
            '628023': { name: 'بانک مسکن', logo: 'maskan-logo.png', cvvLength: 3 },
            '627412': { name: 'بانک اقتصاد نوین', logo: 'en-logo.png', cvvLength: 3 },
            '622106': { name: 'بانک پارسیان', logo: 'parsian-logo.png', cvvLength: 4 },
            '502908': { name: 'بانک توسعه تعاون', logo: 'tosee-logo.png', cvvLength: 3 },
            '627488': { name: 'بانک کارآفرین', logo: 'karafarin-logo.png', cvvLength: 3 },
            '621986': { name: 'بانک سامان', logo: 'saman-logo.png', cvvLength: 4 }
        };

        // وضعیت فرم
        this.state = {
            currentStep: 0,
            timeLeft: this.config.timeoutDuration,
            isProcessing: false,
            validationErrors: new Map(),
            bankInfo: null
        };
    }

    setupEventListeners() {
        // شماره کارت
        this.cardSegments.forEach((segment, index) => {
            segment.addEventListener('input', (e) => this.handleCardNumberInput(e, index));
            segment.addEventListener('keydown', (e) => this.handleCardNumberKeydown(e, index));
            segment.addEventListener('paste', (e) => this.handleCardNumberPaste(e));
            segment.addEventListener('focus', () => this.handleSegmentFocus(index));
        });

        // اطلاعات دارنده کارت
        this.formElements.cardHolder.addEventListener('input', (e) => this.handleCardHolderInput(e));
        this.formElements.month.addEventListener('input', (e) => this.handleExpiryInput(e, 'month'));
        this.formElements.year.addEventListener('input', (e) => this.handleExpiryInput(e, 'year'));
        this.formElements.cvv.addEventListener('input', (e) => this.handleCVVInput(e));
        
        // مدیریت CVV
        this.formElements.cvv.addEventListener('focus', () => this.cardWrapper.classList.add('flipped'));
        this.formElements.cvv.addEventListener('blur', () => this.cardWrapper.classList.remove('flipped'));
        this.formElements.toggleCvv.addEventListener('click', () => this.toggleCVVVisibility());

        // دکمه‌های ناوبری
        this.setupNavigationButtons();

        // ارسال فرم
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupNavigationButtons() {
        document.querySelectorAll('.next-button').forEach(button => {
            button.addEventListener('click', () => {
                if (!button.disabled) this.nextStep();
            });
        });

        document.querySelectorAll('.back-button').forEach(button => {
            button.addEventListener('click', () => this.previousStep());
        });
    }

    handleCardNumberInput(e, index) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 4) {
            value = value.slice(0, 4);
        }

        e.target.value = value;
        this.cardNumberPreviews[index].textContent = value || '####';

        if (value.length === 4 && index < 3) {
            this.cardSegments[index + 1].focus();
        }

        if (index === 0 && value.length === 4) {
            this.detectBank(value);
        }

        this.validateCardNumberSection();
    }

    handleCardNumberKeydown(e, index) {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            this.cardSegments[index - 1].focus();
        }
    }

    handleCardNumberPaste(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbers = pastedText.replace(/\D/g, '').slice(0, 16);
        
        numbers.match(/.{1,4}/g)?.forEach((chunk, index) => {
            if (this.cardSegments[index]) {
                this.cardSegments[index].value = chunk;
                this.cardNumberPreviews[index].textContent = chunk;
            }
        });

        this.validateCardNumberSection();
    }

    handleCardHolderInput(e) {
        const value = e.target.value;
        this.formElements.cardHolderPreview.textContent = value || 'نام و نام خانوادگی';
        this.validateHolderSection();
    }

    handleExpiryInput(e, type) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (type === 'month') {
            if (parseInt(value) > 12) value = '12';
            if (value.length === 1 && parseInt(value) > 1) value = '0' + value;
        } else if (type === 'year') {
            const currentYear = this.config.currentYear;
            if (parseInt(value) < currentYear) value = currentYear.toString();
        }
        
        e.target.value = value;
        this.updateExpiryPreview();
        this.validateHolderSection();
    }

    handleCVVInput(e) {
        const maxLength = this.state.bankInfo?.cvvLength || 3;
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > maxLength) {
            value = value.slice(0, maxLength);
        }
        
        e.target.value = value;
        this.formElements.cvvPreview.textContent = value || '***';
        this.validateHolderSection();
    }

    toggleCVVVisibility() {
        const cvvInput = this.formElements.cvv;
        const toggleButton = this.formElements.toggleCvv;
        
        cvvInput.type = cvvInput.type === 'password' ? 'text' : 'password';
        toggleButton.querySelector('i').classList.toggle('fa-eye');
        toggleButton.querySelector('i').classList.toggle('fa-eye-slash');
    }

    detectBank(firstSegment) {
        for (const [prefix, bankInfo] of Object.entries(this.banks)) {
            if (firstSegment.startsWith(prefix.slice(0, 4))) {
                this.state.bankInfo = bankInfo;
                document.getElementById('bankName').textContent = bankInfo.name;
                document.getElementById('bankLogo').src = bankInfo.logo;
                this.updateCVVRequirements(bankInfo.cvvLength);
                return;
            }
        }
        
        this.state.bankInfo = null;
        document.getElementById('bankName').textContent = 'بانک';
        document.getElementById('bankLogo').src = 'bank-logo.png';
        this.updateCVVRequirements(3);
    }

    validateCardNumberSection() {
        const cardNumber = this.cardSegments.map(seg => seg.value).join('');
        const isValid = cardNumber.length === 16 && this.luhnCheck(cardNumber);
        const nextButton = document.querySelector('#cardNumberSection .next-button');
        
        nextButton.disabled = !isValid;
        
        if (cardNumber.length === 16 && !isValid) {
            this.showError('cardNumber', 'شماره کارت نامعتبر است');
        } else {
            this.hideError('cardNumber');
        }
    }

    validateHolderSection() {
        const isValid = 
            this.formElements.cardHolder.value.length >= this.config.minCardHolderLength &&
            this.formElements.month.value.length === 2 &&
            this.formElements.year.value.length === 2 &&
            this.formElements.cvv.value.length >= (this.state.bankInfo?.cvvLength || 3);
        
        const nextButton = document.querySelector('#cardHolderSection .next-button');
        nextButton.disabled = !isValid;
    }

    showError(section, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message show';
        errorDiv.textContent = message;
        
        const existingError = document.querySelector(`#${section}Section .error-message`);
        if (existingError) existingError.remove();
        
        document.querySelector(`#${section}Section .input-group`).appendChild(errorDiv);
    }

    hideError(section) {
        const errorElement = document.querySelector(`#${section}Section .error-message`);
        if (errorElement) errorElement.remove();
    }

    nextStep() {
        if (this.state.currentStep < this.sections.length - 1) {
            this.sections[this.state.currentStep].classList.remove('active');
            this.state.currentStep++;
            this.sections[this.state.currentStep].classList.add('active');
            this.updateProgress();
            
            if (this.state.currentStep === 2) {
                this.updateConfirmationDetails();
            }
        }
    }

    previousStep() {
        if (this.state.currentStep > 0) {
            this.sections[this.state.currentStep].classList.remove('active');
            this.state.currentStep--;
            this.sections[this.state.currentStep].classList.add('active');
            this.updateProgress();
        }
    }

    updateProgress() {
        const progress = ((this.state.currentStep + 1) / this.sections.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        
        this.steps.forEach((step, index) => {
            step.classList.toggle('active', index <= this.state.currentStep);
        });
    }

    updateConfirmationDetails() {
        const cardNumber = this.cardSegments.map(seg => seg.value).join('-');
        this.formElements.confirmCardNumber.textContent = cardNumber;
        this.formElements.confirmCardHolder.textContent = this.formElements.cardHolder.value;
    }

    startCountdown() {
        const updateTimer = () => {
            const minutes = Math.floor(this.state.timeLeft / 60);
            const seconds = this.state.timeLeft % 60;
            document.getElementById('countdown').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (this.state.timeLeft > 0) {
                this.state.timeLeft--;
                setTimeout(updateTimer, 1000);
            } else {
                this.handleTimeout();
            }
        };
        
        updateTimer();
    }

    handleTimeout() {
        Swal.fire({
            title: 'پایان زمان',
            text: 'زمان تراکنش به پایان رسید.',
            icon: 'error',
            confirmButtonText: 'تلاش مجدد'
        }).then(() => window.location.reload());
    }

    luhnCheck(cardNumber) {
        let sum = 0;
        let isEven = false;
        
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber[i]);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.state.isProcessing) return;
        
        this.state.isProcessing = true;
        const submitButton = document.querySelector('.submit-button');
        submitButton.classList.add('loading');

        try {
            await this.simulatePaymentProcess();
            
            await Swal.fire({
                title: 'پرداخت موفق',
                text: 'تراکنش با موفقیت انجام شد',
                icon: 'success',
                confirmButtonText: 'مشاهده رسید'
            });

            window.location.href = 'receipt.html';

        } catch (error) {
            Swal.fire({
                title: 'خطا',
                text: error.message || 'خطا در پردازش تراکنش',
                icon: 'error',
                confirmButtonText: 'تلاش مجدد'
            });
        } finally {
            this.state.isProcessing = false;
            submitButton.classList.remove('loading');
        }
    }

    simulatePaymentProcess() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) {
                    resolve();
                } else {
                    reject(new Error('خطا در اتصال به درگاه بانک'));
                }
            }, this.config.processingDelay);
        });
    }
}

// راه‌اندازی فرم پرداخت
document.addEventListener('DOMContentLoaded', () => {
    window.paymentForm = new SmartPaymentForm();
});