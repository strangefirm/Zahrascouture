/**
 * Zahra's Couture — Client Shopping Cart & Checkout JS
 */

// Initialize Cart
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Check if we are on the Cart page
    if (document.getElementById('cartItemsList')) {
        renderCartPage();
    }

    // Check if we are on the Checkout page
    if (document.getElementById('checkoutForm')) {
        initCheckoutPage();
    }
});

// Watch storage event to update cart count across multiple tabs
window.addEventListener('storage', () => {
    updateCartBadge();
});

// --- CORE CART UTILITIES ---

function getCart() {
    try {
        const cartStr = localStorage.getItem('zahras_cart');
        return cartStr ? JSON.parse(cartStr) : [];
    } catch (e) {
        console.error('Error reading cart from localStorage:', e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('zahras_cart', JSON.stringify(cart));
    updateCartBadge();
}

function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + parseInt(item.quantity), 0);
}

function updateCartBadge() {
    const badge = document.getElementById('cartNavCount');
    if (badge) {
        badge.textContent = getCartCount();
    }
}

/**
 * Add a product to the cart
 * @param {number} id 
 * @param {string} name 
 * @param {number} price 
 * @param {string} image 
 * @param {string} size 
 */
function addToCart(id, name, price, image, size) {
    const cart = getCart();
    size = size || 'M';

    // Find if item with same ID and size exists
    const existingIndex = cart.findIndex(item => item.id === id && item.size === size);

    if (existingIndex !== -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: price,
            image: image,
            size: size,
            quantity: 1
        });
    }

    saveCart(cart);

    // Subtle micro-animation on cart badge
    const badge = document.getElementById('cartNavCount');
    if (badge) {
        badge.style.transform = 'scale(1.3)';
        badge.style.transition = 'transform 0.15s ease';
        setTimeout(() => {
            badge.style.transform = 'scale(1)';
        }, 150);
    }

    // Show temporary success feedback on the clicked button
    const btn = event?.target;
    if (btn && btn.classList.contains('btn-add-cart')) {
        const originalText = btn.textContent;
        btn.textContent = 'Added to Bag!';
        btn.style.backgroundColor = 'var(--clr-accent)';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 1500);
    }
}

function removeFromCart(id, size) {
    let cart = getCart();
    cart = cart.filter(item => !(item.id === id && item.size === size));
    saveCart(cart);
    
    // Recalculate pages
    if (document.getElementById('cartItemsList')) {
        renderCartPage();
    }
}

function updateQty(id, size, change) {
    const cart = getCart();
    const index = cart.findIndex(item => item.id === id && item.size === size);
    
    if (index !== -1) {
        cart[index].quantity += change;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
        
        if (document.getElementById('cartItemsList')) {
            renderCartPage();
        }
    }
}


// --- CART PAGE RENDER & CALCULATIONS ---

function renderCartPage() {
    const container = document.getElementById('cartItemsList');
    const summaryBox = document.getElementById('cartSummaryBox');
    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="no-products animate-on-scroll" style="text-align: center; padding: var(--space-3xl) 0;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-light)" stroke-width="1.5" style="margin-bottom: var(--space-md);"><circle cx="12" cy="12" r="10"></circle><path d="M8 15h8"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                <h3>Your Shopping Bag is Empty</h3>
                <p style="margin-bottom: var(--space-lg); color: var(--clr-text-muted);">Looks like you haven't added any designer items to your bag yet.</p>
                <a href="/shop" class="btn btn-primary" style="background: var(--clr-primary); box-shadow: none;">Shop Collections</a>
            </div>
        `;
        if (summaryBox) summaryBox.style.display = 'none';
        return;
    }

    // Render cart items list
    let html = `
        <div class="table-responsive">
            <table class="cart-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th>Remove</th>
                    </tr>
                </thead>
                <tbody>
    `;

    cart.forEach(item => {
        const itemImage = item.image.startsWith('product-') ? '/images/uploads/' + item.image : '/images/' + item.image;
        html += `
            <tr>
                <td>
                    <div class="cart-item-info">
                        <img src="${itemImage}" class="cart-item-img" alt="${item.name}">
                        <div>
                            <div class="cart-item-title">${item.name}</div>
                            <span class="spec-tag">Size: ${item.size}</span>
                        </div>
                    </div>
                </td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>
                    <div class="cart-qty-wrapper">
                        <button class="cart-qty-btn" onclick="updateQty(${item.id}, '${item.size}', -1)">-</button>
                        <input type="text" readonly class="cart-qty-input" value="${item.quantity}">
                        <button class="cart-qty-btn" onclick="updateQty(${item.id}, '${item.size}', 1)">+</button>
                    </div>
                </td>
                <td style="font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
                <td>
                    <button class="cart-remove-link" onclick="removeFromCart(${item.id}, '${item.size}')">Remove</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
    if (summaryBox) summaryBox.style.display = 'block';

    // Calculate dynamic totals via server-side shipping calculator
    calculateCartTotals();
}

function calculateCartTotals() {
    const cart = getCart();
    if (cart.length === 0) return;

    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotalSpan = document.getElementById('summarySubtotal');
    if (subtotalSpan) subtotalSpan.textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const shippingSpan = document.getElementById('summaryShipping');
    const totalSpan = document.getElementById('summaryTotal');

    if (shippingSpan) {
        shippingSpan.innerHTML = `<span class="shipping-calc-loading" style="display:inline;">Calculating...</span>`;
    }

    // Call API for dynamic shipping weight calculations
    fetch('/api/shipping-calc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
        })
    })
    .then(res => res.json())
    .then(data => {
        const shipping = data.shippingCost || 0;
        const total = subtotal + shipping;

        if (shippingSpan) {
            shippingSpan.textContent = `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }
        if (totalSpan) {
            totalSpan.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }
    })
    .catch(err => {
        console.error('Error calculating shipping:', err);
        if (shippingSpan) shippingSpan.textContent = 'Error calculating';
        if (totalSpan) totalSpan.textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    });
}


// --- CHECKOUT PAGE ACTIONS ---

function initCheckoutPage() {
    const cart = getCart();

    // If cart is empty, redirect to shop
    if (cart.length === 0) {
        window.location.href = '/shop';
        return;
    }

    // Render summary items list
    const container = document.getElementById('checkoutItemsList');
    if (container) {
        let html = '';
        cart.forEach(item => {
            const itemImage = item.image.startsWith('product-') ? '/images/uploads/' + item.image : '/images/' + item.image;
            html += `
                <div class="sidebar-item">
                    <img src="${itemImage}" class="sidebar-item-img" alt="${item.name}">
                    <div class="sidebar-item-info">
                        <div class="sidebar-item-title">${item.name}</div>
                        <div class="sidebar-item-meta">Size: ${item.size} &times; ${item.quantity}</div>
                    </div>
                    <div class="sidebar-item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // Calculate checkout totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutSubtotal').textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const shippingSpan = document.getElementById('checkoutShipping');
    const totalSpan = document.getElementById('checkoutTotal');

    fetch('/api/shipping-calc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
        })
    })
    .then(res => res.json())
    .then(data => {
        const shipping = data.shippingCost || 0;
        const total = subtotal + shipping;

        if (shippingSpan) shippingSpan.textContent = `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (totalSpan) totalSpan.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    })
    .catch(err => {
        console.error(err);
        if (shippingSpan) shippingSpan.textContent = '₹0.00';
        if (totalSpan) totalSpan.textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    });

    // Form Submission
    const form = document.getElementById('checkoutForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('customer_name').value.trim();
        const phone = document.getElementById('customer_phone').value.trim();
        const email = document.getElementById('customer_email').value.trim();
        const address = document.getElementById('customer_address').value.trim();
        const city = document.getElementById('city').value.trim();
        const pincode = document.getElementById('pincode').value.trim();
        const errorDiv = document.getElementById('checkoutError');

        if (!name || !phone || !address || !city || !pincode) {
            showError('Please fill in all required fields.');
            return;
        }

        // Disable submit button during placement
        const submitBtn = form.querySelector('.place-order-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating Invoice...';
        if (errorDiv) errorDiv.style.display = 'none';

        // Submit order data
        fetch('/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer_name: name,
                customer_phone: phone,
                customer_email: email,
                customer_address: address,
                city: city,
                pincode: pincode,
                cartItems: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    size: item.size
                }))
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.orderNumber) {
                // Clear the local cart
                localStorage.removeItem('zahras_cart');
                // Redirect to generated Invoice preview page
                window.location.href = `/orders/${data.orderNumber}/invoice`;
            } else {
                showError(data.error || 'Failed to place order. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        })
        .catch(err => {
            console.error('Order submission error:', err);
            showError('A network error occurred while submitting your order. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
    });

    function showError(message) {
        const errorDiv = document.getElementById('checkoutError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.color = '#c53030';
            errorDiv.style.backgroundColor = '#fff5f5';
            errorDiv.style.padding = '12px';
            errorDiv.style.borderRadius = 'var(--radius-sm)';
            errorDiv.style.border = '1px solid #fed7d7';
            errorDiv.style.marginTop = 'var(--space-md)';
        }
    }
}
