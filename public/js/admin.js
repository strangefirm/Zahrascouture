/**
 * Zahra's Couture — Admin Panel Script
 */

/**
 * Quick save stock and price inline from the spreadsheet-like sheet.
 * @param {number} productId 
 */
function quickSave(productId) {
    const row = document.getElementById(`prod-row-${productId}`);
    if (!row) return;

    const priceInput = row.querySelector('.inline-price');
    const sizeStockInputs = row.querySelectorAll('.inline-stock-size');

    if (!priceInput) return;

    const price = parseFloat(priceInput.value);

    if (isNaN(price) || price < 0) {
        alert('Please enter a valid price.');
        priceInput.focus();
        return;
    }

    const stock = {};
    let hasInvalidStock = false;
    sizeStockInputs.forEach(input => {
        const size = input.dataset.size;
        const val = parseInt(input.value);
        if (isNaN(val) || val < 0) {
            hasInvalidStock = true;
            input.focus();
        } else {
            stock[size] = val;
        }
    });

    if (hasInvalidStock) {
        alert('Please enter valid stock quantities.');
        return;
    }

    // Visual loading state (subtle opacity change on the row)
    row.style.opacity = '0.6';

    fetch(`/admin/products/${productId}/quick-edit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            price: price,
            stock: stock
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server responded with an error');
        }
        return response.json();
    })
    .then(data => {
        row.style.opacity = '1';
        if (data.success) {
            // Flash success styling on inputs
            flashInputFeedback(priceInput, true);
            sizeStockInputs.forEach(input => flashInputFeedback(input, true));
        } else {
            flashInputFeedback(priceInput, false);
            sizeStockInputs.forEach(input => flashInputFeedback(input, false));
            alert('Failed to save changes: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        row.style.opacity = '1';
        flashInputFeedback(priceInput, false);
        sizeStockInputs.forEach(input => flashInputFeedback(input, false));
        console.error('Error saving inline edits:', error);
        alert('An error occurred while quick saving. Please check your connection.');
    });
}

/**
 * Flash inputs in green (success) or red (failure) for visual feedback.
 * @param {HTMLInputElement} input 
 * @param {boolean} isSuccess 
 */
function flashInputFeedback(input, isSuccess) {
    const originalBorder = input.style.borderColor;
    const originalBg = input.style.backgroundColor;

    if (isSuccess) {
        input.style.borderColor = '#48bb78';
        input.style.backgroundColor = '#f0fff4';
    } else {
        input.style.borderColor = '#f56565';
        input.style.backgroundColor = '#fff5f5';
    }

    setTimeout(() => {
        input.style.borderColor = originalBorder;
        input.style.backgroundColor = originalBg;
    }, 1000);
}
