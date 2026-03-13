const INITIAL_PRODUCTS = [
    { 
        id: 'P1', 
        name: 'Cerveza Corona Extra 355ml', 
        category: 'cervezas', 
        price: 1200, 
        stock: 145, 
        image: 'https://i.ibb.co/ccPgLr5V/cerveza-corona-330cc.jpg' 
    },
    { 
        id: 'P2', 
        name: 'Cerveza Stella Artois 330ml', 
        category: 'cervezas', 
        price: 1500, 
        stock: 89, 
        image: 'https://i.ibb.co/pvJK3qKv/Stella-Artois-birras-deluxe-malaga.webp' 
    },
    { 
        id: 'P3', 
        name: 'Cerveza Kunstmann Torobayo', 
        category: 'cervezas', 
        price: 2200, 
        stock: 45, 
        image: 'https://i.ibb.co/bRK5CYKV/20-CC66-1c42836a-729a-4372-a490-bd7785b192de.jpg' 
    },
    { 
        id: 'P4', 
        name: 'Vino Casillero del Diablo Cabernet', 
        category: 'vinos', 
        price: 4500, 
        stock: 32, 
        image: 'https://i.ibb.co/Pv5vhx37/vinodiablo.avif' 
    },
    { 
        id: 'P5', 
        name: 'Vino Gato Negro Merlot', 
        category: 'vinos', 
        price: 2500, 
        stock: 60, 
        image: 'https://i.ibb.co/YFhYfWSK/21859-0-botellon-gato-merlot-15l.jpg' 
    },
    { 
        id: 'P6', 
        name: 'Coca-Cola Original 2.5L', 
        category: 'bebidas', 
        price: 2300, 
        stock: 80, 
        image: 'https://i.ibb.co/dwZQ7B9X/7801610001523-1.png' 
    }
];

export const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'cervezas', name: 'Cervezas' },
    { id: 'vinos', name: 'Vinos' },
    { id: 'licores', name: 'Licores' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'snacks', name: 'Snacks' }
];

// Carga persistente
export let products = JSON.parse(localStorage.getItem('dbor_inventory')) || INITIAL_PRODUCTS;
export let sales = JSON.parse(localStorage.getItem('dbor_sales')) || [];

export function saveInventory() {
    localStorage.setItem('dbor_inventory', JSON.stringify(products));
}

export function saveSales() {
    localStorage.setItem('dbor_sales', JSON.stringify(sales));
}

export function formatCurrency(amount) {
    // Formato chileno: $1.234.567 (sin decimales)
    return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('CLP', '').trim();
}