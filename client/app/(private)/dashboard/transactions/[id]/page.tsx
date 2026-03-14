"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useGetTransactionQuery } from "@/app/store/apis/TransactionApi";

import PageHeader from "../PageHeader";
import ErrorState from "../ErrorState";
import TransactionOverview from "../TransactionOverview";
import OrderInformation from "../OrderInformation";
import PaymentInformation from "../PaymentInformation";
import ShipmentInformation from "../ShipmentInformation";
import CustomerInformation from "../CustomerInformation";
import ShippingAddress from "../ShippingAddress";
import TransactionTimeline from "../TransactionTimeline";
import ProductInformation from "../ProductInformation";

const statusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Failed", value: "FAILED" },
];

const TransactionDetails = () => {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data, isLoading, error } = useGetTransactionQuery(id);

    const [newStatus, setNewStatus] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const onBack = () => {
        router.back();
    };

    const onUpdateStatus = async () => {
        if (!newStatus) return;

        try {
            setIsUpdating(true);

            // API call here
            console.log("Updating status to:", newStatus);

        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) return <p className="p-6">Loading transaction...</p>;

    if (error) {
        let errorMessage = "Failed to load transaction";

        if ("data" in error) {
            const errData = error.data as { message?: string };
            errorMessage = errData?.message || errorMessage;
        } else if ("message" in error) {
            errorMessage = error.message || errorMessage;
        }

        return <ErrorState message={errorMessage} onBack={onBack} />;
    }

    const transaction = data?.transaction;
    const order = transaction?.order;

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                transaction={transaction}
                onBack={onBack}
                onUpdateStatus={onUpdateStatus}
                isUpdating={isUpdating}
                newStatus={newStatus}
                setNewStatus={setNewStatus}
                statusOptions={statusOptions}
            />

            <TransactionOverview transaction={transaction} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrderInformation order={order} />
                <ProductInformation orderItems={transaction?.order?.orderItems} />
                <PaymentInformation payment={order.payment} />
                <ShipmentInformation shipment={order.shipment} />
                <CustomerInformation user={order.user} />
            </div>

            <ShippingAddress address={order.address} />

            <TransactionTimeline
                transaction={transaction}
                payment={order.payment}
            />
        </div>
    );
};

export default TransactionDetails;