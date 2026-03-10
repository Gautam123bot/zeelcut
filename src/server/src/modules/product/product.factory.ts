import { ProductService } from "./product.service";
import { ProductRepo } from "./product.repository";
import { ProductController } from "./product.controller";
import { AttributeRepository } from "../attribute/attribute.repository";
import { VariantRepository } from "../variant/variant.repository";

export const makeProductController = () => {
  const productRepository = new ProductRepo();
  const attrRepository = new AttributeRepository();
  const variantRepository = new VariantRepository();
  const service = new ProductService(productRepository, attrRepository, variantRepository);
  return new ProductController(service);
};
