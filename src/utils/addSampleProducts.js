import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const sampleProducts = [{
        name: "iPhone 15 Pro",
        price: 999,
        originalPrice: 1099,
        category: "Electronics",
        description: "Latest iPhone with advanced camera system",
        stock: 50,
        imageUrl: "https://via.placeholder.com/300x200?text=iPhone+15+Pro",
        rating: 4.8,
        soldCount: 120,
        newArrival: true,
        topSale: true,
        flashSale: false,
        createdAt: new Date()
    },
    {
        name: "Samsung Galaxy S24",
        price: 899,
        originalPrice: 999,
        category: "Electronics",
        description: "Premium Android smartphone with AI features",
        stock: 35,
        imageUrl: "https://via.placeholder.com/300x200?text=Samsung+Galaxy+S24",
        rating: 4.7,
        soldCount: 95,
        newArrival: true,
        topSale: false,
        flashSale: true,
        createdAt: new Date()
    },
    {
        name: "Nike Air Max 270",
        price: 150,
        originalPrice: 180,
        category: "Footwear",
        description: "Comfortable running shoes with Air Max technology",
        stock: 25,
        imageUrl: "https://via.placeholder.com/300x200?text=Nike+Air+Max+270",
        rating: 4.6,
        soldCount: 200,
        newArrival: false,
        topSale: true,
        flashSale: false,
        createdAt: new Date()
    },
    {
        name: "MacBook Pro M3",
        price: 1999,
        originalPrice: 2199,
        category: "Electronics",
        description: "Powerful laptop for professionals",
        stock: 20,
        imageUrl: "https://via.placeholder.com/300x200?text=MacBook+Pro+M3",
        rating: 4.9,
        soldCount: 75,
        newArrival: true,
        topSale: true,
        flashSale: false,
        createdAt: new Date()
    },
    {
        name: "Adidas Ultraboost 22",
        price: 180,
        originalPrice: 200,
        category: "Footwear",
        description: "Premium running shoes with Boost technology",
        stock: 30,
        imageUrl: "https://via.placeholder.com/300x200?text=Adidas+Ultraboost+22",
        rating: 4.5,
        soldCount: 150,
        newArrival: false,
        topSale: false,
        flashSale: true,
        createdAt: new Date()
    },
    {
        name: "Sony WH-1000XM5",
        price: 349,
        originalPrice: 399,
        category: "Electronics",
        description: "Premium noise-cancelling headphones",
        stock: 40,
        imageUrl: "https://via.placeholder.com/300x200?text=Sony+WH-1000XM5",
        rating: 4.8,
        soldCount: 180,
        newArrival: false,
        topSale: true,
        flashSale: false,
        createdAt: new Date()
    },
    {
        name: "Levi's 501 Jeans",
        price: 89,
        originalPrice: 99,
        category: "Clothing",
        description: "Classic straight fit jeans",
        stock: 60,
        imageUrl: "https://via.placeholder.com/300x200?text=Levi's+501+Jeans",
        rating: 4.4,
        soldCount: 300,
        newArrival: false,
        topSale: false,
        flashSale: true,
        createdAt: new Date()
    },
    {
        name: "Apple Watch Series 9",
        price: 399,
        originalPrice: 449,
        category: "Electronics",
        description: "Advanced smartwatch with health monitoring",
        stock: 25,
        imageUrl: "https://via.placeholder.com/300x200?text=Apple+Watch+Series+9",
        rating: 4.7,
        soldCount: 120,
        newArrival: true,
        topSale: false,
        flashSale: false,
        createdAt: new Date()
    }
];

export const addSampleProducts = async() => {
    try {
        const productsRef = collection(db, 'products');

        for (const product of sampleProducts) {
            await addDoc(productsRef, product);
            console.log(`Added product: ${product.name}`);
        }

        console.log('All sample products added successfully!');
    } catch (error) {
        console.error('Error adding sample products:', error);
    }
};

// Run this function to add sample products
// addSampleProducts();