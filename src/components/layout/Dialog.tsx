import * as Dialog from "@radix-ui/react-dialog";
import { useChat } from "../../context/ChatContext";
import { useState } from "react";

const DialogDemo = () => {
    
    const { addBalance } = useChat();
    
    const [amount, setAmount] = useState<number>(0.00);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(parseFloat(e.target.value));
    };

    const handleAddFunds = () => {
        if (amount > 0 && addBalance) {
            addBalance(amount);
            setAmount(0);
        } else {
            alert("Please enter a valid amount.");
        }
    };

    return (<Dialog.Root>
        <Dialog.Trigger asChild>
            <button className="inline-flex py-3 items-center justify-center border-1 border-slate-700 rounded-xl px-[15px] font-bold leading-none hover:bg-slate-700 cursor-pointer transition-all duration-200">
                Add Funds
            </button>
        </Dialog.Trigger>
        <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 data-[state=open]:animate-overlayShow" />
            <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-slate-800 p-[25px] shadow-md focus:outline-none data-[state=open]:animate-contentShow">
                <Dialog.Title className="m-0 text-[17px] font-medium text-white">
                    Add Funds
                </Dialog.Title>
                <Dialog.Description className="mb-5 mt-2.5 text-[15px] leading-normal text-white">
                    Enter the amount you would like to add to your account.
                    In USDC to this node.
                </Dialog.Description>
                <div className="mb-4 p-3 bg-orange-900/30 border border-orange-700 text-sm text-slate-300">
                    <p className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                        </svg>
                        Funds may take a few minutes to appear in your balance.
                    </p>
                </div>
                <fieldset className="mb-[15px] flex items-center gap-5">
                    <label
                        className="w-[90px] text-right text-[15px] text-slate-200"
                        htmlFor="amount"
                    >
                        Amount USDC
                    </label>
                    <input
                        className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded px-2.5 text-[15px] leading-none text-slate-200 shadow-[0_0_0_1px] shadow-slate-500 outline-none focus:shadow-[0_0_0_2px] focus:shadow-slate-600"
                        id="amount"
                        type="number"
                        min="0"
                        step="1"
                        //defaultValue="0.00"
                        onChange={handleAmountChange}
                        value={amount || 0}
                    />
                </fieldset>

                <div className="mt-[25px] flex justify-end">
                    <Dialog.Close asChild>
                        <button className="inline-flex h-[35px] items-center justify-center rounded 
                            bg-green-200 px-[15px] font-medium leading-none text-green-700 outline-none
                            outline-offset-1 hover:bg-green-300 focus-visible:outline-2 focus-visible:outline-green-400 select-none"
                            onClick={handleAddFunds}
                        >
                            Add Funds
                        </button>
                    </Dialog.Close>
                </div>
                <Dialog.Close asChild>
                    <button
                        className="absolute right-2.5 top-2.5 inline-flex size-[25px] appearance-none items-center justify-center rounded-full text-slate-500 bg-slate-700 hover:bg-slate-900 focus:shadow-[0_0_0_2px] focus:shadow-slate-500 focus:outline-none"
                        aria-label="Close"
                    >
                        X
                    </button>
                </Dialog.Close>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
    )
};

export default DialogDemo;
