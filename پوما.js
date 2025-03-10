// cart.js
class ShoppingCart {
    constructor() {
        this.initializeElements();
        this.loadCart();
        this.bindEvents();
        this.updateCartDisplay();
    }

    initializeElements() {
        // سبد خرید
        this.cartButton = document.getElementById('cart-button');
        this.cartModal = document.getElementById('cart-modal');
        this.cartItems = document.querySelector('.cart-items');
        this.cartCount = document.getElementById('cart-count');
        this.closeCartBtn = document.querySelector('.close-cart');
        this.clearCartBtn = document.getElementById('clear-cart');
        this.checkoutBtn = document.getElementById('checkout-btn');
        this.totalItems = document.getElementById('total-items');
        this.subtotalElement = document.getElementById('subtotal');
        this.discountElement = document.getElementById('discount');
        this.totalPriceElement = document.getElementById('total-price');
        
        // محصول
        this.addToCartBtn = document.querySelector('.add-to-cart');
        this.sizeOptions = document.querySelectorAll('.size-option');
        this.quantityBtns = document.querySelectorAll('.quantity-btn');
        this.quantityDisplay = document.querySelector('.quantity-display');
        
        // نوتیفیکیشن
        this.notification = document.getElementById('notification');
    }

    loadCart() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
    }

    bindEvents() {
        // سبد خرید
        if (this.cartButton) {
            this.cartButton.addEventListener('click', () => this.toggleCart());
        }
        if (this.closeCartBtn) {
            this.closeCartBtn.addEventListener('click', () => this.hideCart());
        }
        if (this.clearCartBtn) {
            this.clearCartBtn.addEventListener('click', () => this.clearCart());
        }
        if (this.checkoutBtn) {
            this.checkoutBtn.addEventListener('click', () => this.checkout());
        }

        // افزودن به سبد
        if (this.addToCartBtn) {
            this.addToCartBtn.addEventListener('click', () => this.addToCart());
        }

        // کنترل تعداد
        if (this.quantityBtns) {
            this.quantityBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    let quantity = parseInt(this.quantityDisplay.textContent);
                    if (btn.classList.contains('decrease')) {
                        quantity = Math.max(1, quantity - 1);
                    } else {
                        quantity = Math.min(10, quantity + 1);
                    }
                    this.quantityDisplay.textContent = quantity;
                });
            });
        }

        // انتخاب سایز
        if (this.sizeOptions) {
            this.sizeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    this.sizeOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
        }

        // بستن با کلید Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideCart();
        });

        // کلیک خارج از مدال
        if (this.cartModal) {
            this.cartModal.addEventListener('click', (e) => {
                if (e.target === this.cartModal) this.hideCart();
            });
        }
    }

    toggleCart() {
        if (this.cartModal) {
            const isVisible = this.cartModal.style.display === 'flex';
            this.cartModal.style.display = isVisible ? 'none' : 'flex';
            document.body.style.overflow = isVisible ? '' : 'hidden';
        }
    }

    hideCart() {
        if (this.cartModal) {
            this.cartModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    addToCart() {
        const selectedSize = document.querySelector('.size-option.selected');
        if (!selectedSize) {
            this.showNotification('لطفاً سایز را انتخاب کنید', 'error');
            return;
        }

        const productTitle = document.querySelector('.product-title').textContent;
        const productPrice = this.extractPrice(document.querySelector('.current-price').textContent);
        const productImage = document.querySelector('.main-image').src;
        const quantity = parseInt(this.quantityDisplay.textContent);
        const size = selectedSize.textContent;

        const existingItemIndex = this.cart.findIndex(item => 
            item.title === productTitle && item.size === size
        );

        if (existingItemIndex > -1) {
            this.cart[existingItemIndex].quantity += quantity;
        } else {
            const newItem = {
                id: Date.now(),
                title: productTitle,
                price: productPrice,
                image: productImage,
                size: size,
                quantity: quantity
            };
            this.cart.push(newItem);
        }

        this.saveCart();
        this.updateCartDisplay();
        this.showNotification('محصول به سبد خرید اضافه شد', 'success');
    }

    removeFromCart(id) {
        this.cart = this.cart.filter(item => item.id !== id);
        this.saveCart();
        this.updateCartDisplay();
        this.showNotification('محصول از سبد خرید حذف شد', 'success');
    }

    updateCartDisplay() {
        if (!this.cartCount || !this.cartItems) return;

        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        this.cartCount.textContent = totalItems;
        if (this.totalItems) {
            this.totalItems.textContent = totalItems;
        }

        this.renderCartItems();
        this.updateCartTotals();
    }

    renderCartItems() {
        if (!this.cartItems) return;

        if (this.cart.length === 0) {
            this.cartItems.innerHTML = '<div class="empty-cart">سبد خرید خالی است</div>';
            return;
        }

        this.cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-item-details">
                    <h3>${item.title}</h3>
                    <p>سایز: ${item.size}</p>
                    <div class="cart-item-quantity">
                        <button onclick="cart.updateItemQuantity(${item.id}, 'decrease')">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="cart.updateItemQuantity(${item.id}, 'increase')">+</button>
                    </div>
                    <p class="cart-item-price">${this.formatPrice(item.price * item.quantity)}</p>
                </div>
                <button class="remove-item" onclick="cart.removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    updateItemQuantity(id, action) {
        const itemIndex = this.cart.findIndex(item => item.id === id);
        if (itemIndex === -1) return;

        if (action === 'increase') {
            this.cart[itemIndex].quantity = Math.min(this.cart[itemIndex].quantity + 1, 10);
        } else if (action === 'decrease') {
            if (this.cart[itemIndex].quantity > 1) {
                this.cart[itemIndex].quantity--;
            } else {
                this.removeFromCart(id);
                return;
            }
        }

        this.saveCart();
        this.updateCartDisplay();
    }

    updateCartTotals() {
        if (!this.subtotalElement || !this.discountElement || !this.totalPriceElement) return;

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = 0; // محاسبه تخفیف
        const total = subtotal - discount;

        this.subtotalElement.textContent = this.formatPrice(subtotal);
        this.discountElement.textContent = this.formatPrice(discount);
        this.totalPriceElement.textContent = this.formatPrice(total);
    }

    clearCart() {
        if (confirm('آیا از خالی کردن سبد خرید مطمئن هستید؟')) {
            this.cart = [];
            this.saveCart();
            this.updateCartDisplay();
            this.showNotification('سبد خرید خالی شد', 'success');
        }
    }

    checkout() {
        if (this.cart.length === 0) {
            this.showNotification('سبد خرید خالی است', 'error');
            return;
        }
        alert('در حال انتقال به درگاه پرداخت...');
    }

    showNotification(message, type = 'success') {
        if (!this.notification) return;

        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        this.notification.style.display = 'block';

        setTimeout(() => {
            this.notification.style.display = 'none';
        }, 3000);
    }

    formatPrice(price) {
        return price.toLocaleString('fa-IR') + ' تومان';
    }

    extractPrice(priceString) {
        return parseInt(priceString.replace(/[^\d]/g, ''));
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }
}

// راه‌اندازی با DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.cart = new ShoppingCart();
});
// متغیرهای مورد نیاز
const mainImage = document.getElementById('mainImage');
const mainImageContainer = document.getElementById('mainImageContainer');
const zoomModal = document.getElementById('zoomModal');
const zoomImage = document.getElementById('zoomImage');
const closeZoom = document.querySelector('.close-zoom');

// تغییر تصویر اصلی با کلیک روی تصاویر کوچک
function changeImage(element) {
    mainImage.src = element.src;
    // حذف کلاس active از همه thumbnails
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    // اضافه کردن کلاس active به thumbnail انتخاب شده
    element.classList.add('active');
}

// باز کردن مدال بزرگنمایی
mainImageContainer.addEventListener('click', function() {
    zoomModal.style.display = 'flex';
    zoomImage.src = mainImage.src;
    document.body.style.overflow = 'hidden'; // جلوگیری از اسکرول صفحه
});

// بستن مدال
closeZoom.addEventListener('click', function() {
    zoomModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

// بستن مدال با کلیک خارج از تصویر
zoomModal.addEventListener('click', function(e) {
    if (e.target === zoomModal) {
        zoomModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// بستن مدال با کلید ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && zoomModal.style.display === 'flex') {
        zoomModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// پشتیبانی از حرکات لمسی
let touchStartX = 0;
let touchEndX = 0;

zoomImage.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

zoomImage.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const difference = touchEndX - touchStartX;
    
    if (Math.abs(difference) > swipeThreshold) {
        const thumbnails = document.querySelectorAll('.thumbnail');
        const currentIndex = Array.from(thumbnails)
            .findIndex(thumb => thumb.src === mainImage.src);
        
        if (difference > 0 && currentIndex > 0) {
            // سوایپ به راست
            thumbnails[currentIndex - 1].click();
        } else if (difference < 0 && currentIndex < thumbnails.length - 1) {
            // سوایپ به چپ
            thumbnails[currentIndex + 1].click();
        }
    }
}
