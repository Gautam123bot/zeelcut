"use client";

import useFormatPrice from "@/app/hooks/ui/useFormatPrice";
import formatDate from "@/app/utils/formatDate";
import { Package } from "lucide-react";

const ProductInformation = ({ orderItems }) => {
  const format = useFormatPrice();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center mb-4">
        <Package className="mr-2 text-blue-600" size={20} />
        <h2 className="text-lg font-semibold">Product Information</h2>
      </div>

      <div className="space-y-6">
        {orderItems?.map((item) => {
          const variant = item?.variant;
          const product = variant?.product;

          return (
            <div
              key={item?.id}
              className="border rounded-lg p-4 bg-gray-50 space-y-4"
            >
              {/* Product Header */}
              <div className="flex items-center gap-4">
                {variant?.images?.[0] && (
                  <img
                    src={variant.images[0]}
                    alt={product?.name}
                    className="w-16 h-16 rounded-md object-cover border"
                  />
                )}

                <div>
                  <p className="font-semibold text-gray-800">
                    {product?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    SKU: {variant?.sku}
                  </p>
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">

                <div>
                  <p className="text-sm text-gray-500">Product ID</p>
                  <p className="font-mono">
                    {product?.id?.substring(0, 8)}...
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Variant ID</p>
                  <p className="font-mono">
                    {variant?.id?.substring(0, 8)}...
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p>{product?.category?.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-medium">
                    {format(item?.price)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p>{item?.quantity}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Stock Available</p>
                  <p>{variant?.stock}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Sales Count</p>
                  <p>{product?.salesCount}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p>{formatDate(product?.createdAt)}</p>
                </div>

              </div>

              {/* Attributes */}
              {variant?.attributes?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Product Attributes
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {variant.attributes.map((attr) => (
                      <span
                        key={attr?.id}
                        className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700"
                      >
                        {attr.attribute?.name}: {attr.value?.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductInformation;