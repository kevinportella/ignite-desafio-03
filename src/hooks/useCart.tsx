
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateLocalStorage(newCart: Product[]) {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  async function getProductStock(productId: number) {
    const stockResponse = await api.get<Stock>(`/stock/${productId}`)
    const { amount: stock } = stockResponse.data;
    return stock || 0;
  }

  const addProduct = async (productId: number) => {
    try {
      const stock = await getProductStock(productId);
      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId)
      const amount = (productExists ? productExists.amount : 0) + 1;   
            

      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      if (productExists) {
        productExists.amount = amount;
      } else {
        
        const product = await api.get<Product>(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount
        }
        updateCart.push(newProduct);        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      } 
      
      setCart(updateCart);
      updateLocalStorage(updateCart)
    } catch {      
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error ();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };  

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        throw Error();
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.findIndex(product => product.id === productId);

      if (productExists < 0) {
        toast.error('Erro na alteração de quantidade do produto')
        return;
      }

      const stock = await getProductStock(productId);

      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
        
      } else {
        
        updatedCart[productExists].amount = amount;
        
        setCart(updatedCart);
        updateLocalStorage(updatedCart);
      }
    } catch {
      toast.error('Erro na alteração da quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
