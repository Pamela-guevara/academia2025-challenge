import { Pool } from "pg";

// Configuración de la base de datos PostgreSQL
const DB_CONFIG = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "challenge_api",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
};

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(DB_CONFIG);
    this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      // Probar conexión
      const client = await this.pool.connect();
      console.log("✅ Conectado a PostgreSQL");
      client.release();

      // Inicializar tablas
      await this.initializeTables();
    } catch (err) {
      console.error("❌ Error al conectar con PostgreSQL:", err);
      console.log("📋 Configuración de base de datos:");
      console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
      console.log(`   Database: ${DB_CONFIG.database}`);
      console.log(`   User: ${DB_CONFIG.user}`);
      console.log("");
      console.log("🔧 Para configurar PostgreSQL:");
      console.log("   1. Instala PostgreSQL");
      console.log(
        "   2. Crea la base de datos: CREATE DATABASE challenge_api;"
      );
      console.log(
        "   3. O configura variables de entorno: DB_HOST, DB_USER, DB_PASSWORD, etc."
      );
    }
  }

  private async initializeTables() {
    try {
      // Crear tabla de usuarios si no existe
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await this.pool.query(createUsersTable);
      console.log("✅ Tabla users lista");

      // Crear tabla de productos si no existe
      const createProductsTable = `
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          category VARCHAR(100) NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await this.pool.query(createProductsTable);
      console.log("✅ Tabla products lista");

      await this.insertInitialData();
    } catch (err) {
      console.error("Error al crear tablas:", err);
    }
  }

  private async insertInitialData() {
    try {
      // Verificar si ya hay datos de usuarios
      const userResult = await this.pool.query(
        "SELECT COUNT(*) as count FROM users"
      );
      const userCount = parseInt(userResult.rows[0].count);

      // Si no hay usuarios, insertar datos de prueba
      if (userCount === 0) {
        const insertUsers = `
          INSERT INTO users (name, email, password) VALUES 
          ('Juan Pérez', 'juan@example.com', '123456'),
          ('María García', 'maria@example.com', '654321')
          RETURNING id, name, email, created_at
        `;

        const insertResult = await this.pool.query(insertUsers);
        console.log("✅ Datos iniciales de usuarios insertados");
        console.log(`   ${insertResult.rows.length} usuarios creados`);
      }

      // Verificar si ya hay datos de productos
      const productResult = await this.pool.query(
        "SELECT COUNT(*) as count FROM products"
      );
      const productCount = parseInt(productResult.rows[0].count);

      // Si no hay productos, insertar datos de prueba
      if (productCount === 0) {
        const insertProducts = `
          INSERT INTO products (name, description, price, stock, category) VALUES 
          ('Laptop Dell XPS 13', 'Laptop ultrabook con procesador Intel i7', 1299.99, 10, 'Tecnología'),
          ('iPhone 15 Pro', 'Smartphone Apple con cámara profesional', 999.99, 25, 'Tecnología'),
          ('Auriculares Sony WH-1000XM5', 'Auriculares inalámbricos con cancelación de ruido', 349.99, 15, 'Audio'),
          ('Mesa de Oficina', 'Mesa ergonómica para trabajo', 299.99, 5, 'Muebles'),
          ('Silla Gaming', 'Silla cómoda para largas sesiones', 199.99, 8, 'Muebles')
          RETURNING id, name, price, category
        `;

        const insertProductResult = await this.pool.query(insertProducts);
        console.log("✅ Datos iniciales de productos insertados");
        console.log(`   ${insertProductResult.rows.length} productos creados`);
      }
    } catch (err) {
      console.error("Error al insertar datos iniciales:", err);
    }
  }

  // Métodos para operaciones CRUD de usuarios
  async getAllUsers(): Promise<any[]> {
    try {
      const result = await this.pool.query(
        "SELECT id, name, email, created_at FROM users ORDER BY id"
      );
      return result.rows;
    } catch (err) {
      console.error("Error en getAllUsers:", err);
      throw err;
    }
  }

  async getUserById(id: number): Promise<any> {
    try {
      const result = await this.pool.query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("Error en getUserById:", err);
      throw err;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("Error en getUserByEmail:", err);
      throw err;
    }
  }

  async createUser(
    name: string,
    email: string,
    password: string
  ): Promise<any> {
    try {
      const result = await this.pool.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
        [name, email, password]
      );
      return result.rows[0];
    } catch (err) {
      console.error("Error en createUser:", err);
      throw err;
    }
  }

  async updateUser(
    id: number,
    name?: string,
    email?: string,
    password?: string
  ): Promise<any> {
    try {
      // Construir query dinámicamente
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }
      if (email) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }
      if (password) {
        updates.push(`password = $${paramCount}`);
        values.push(password);
        paramCount++;
      }

      if (updates.length === 0) {
        throw new Error("No hay campos para actualizar");
      }

      values.push(id);
      const query = `UPDATE users SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING id, name, email, created_at`;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      return result.rows[0];
    } catch (err) {
      console.error("Error en updateUser:", err);
      throw err;
    }
  }

  async deleteUser(id: number): Promise<any> {
    try {
      // Obtener los datos del usuario antes de eliminarlo
      const selectResult = await this.pool.query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [id]
      );

      if (selectResult.rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const user = selectResult.rows[0];

      // Eliminar el usuario
      await this.pool.query("DELETE FROM users WHERE id = $1", [id]);

      return user;
    } catch (err) {
      console.error("Error en deleteUser:", err);
      throw err;
    }
  }

  // Métodos para operaciones CRUD de productos
  async getAllProducts(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, description, price, stock, category, active, 
               created_at as "createdAt", updated_at as "updatedAt" 
        FROM products 
        ORDER BY id
      `);
      return result.rows;
    } catch (err) {
      console.error("Error en getAllProducts:", err);
      throw err;
    }
  }

  async getProductById(id: number): Promise<any> {
    try {
      const result = await this.pool.query(
        `
        SELECT id, name, description, price, stock, category, active, 
               created_at as "createdAt", updated_at as "updatedAt" 
        FROM products 
        WHERE id = $1
      `,
        [id]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("Error en getProductById:", err);
      throw err;
    }
  }

  async getProductsByCategory(category: string): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `
        SELECT id, name, description, price, stock, category, active, 
               created_at as "createdAt", updated_at as "updatedAt" 
        FROM products 
        WHERE category = $1 AND active = true
        ORDER BY name
      `,
        [category]
      );
      return result.rows;
    } catch (err) {
      console.error("Error en getProductsByCategory:", err);
      throw err;
    }
  }

  async searchProducts(searchTerm: string): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `
        SELECT id, name, description, price, stock, category, active, 
               created_at as "createdAt", updated_at as "updatedAt" 
        FROM products 
        WHERE (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1) 
        AND active = true
        ORDER BY name
      `,
        [`%${searchTerm}%`]
      );
      return result.rows;
    } catch (err) {
      console.error("Error en searchProducts:", err);
      throw err;
    }
  }

  async createProduct(
    name: string,
    description: string,
    price: number,
    stock: number,
    category: string,
    active: boolean = true
  ): Promise<any> {
    try {
      const result = await this.pool.query(
        `
        INSERT INTO products (name, description, price, stock, category, active) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id, name, description, price, stock, category, active, 
                  created_at as "createdAt", updated_at as "updatedAt"
      `,
        [name, description, price, stock, category, active]
      );
      return result.rows[0];
    } catch (err) {
      console.error("Error en createProduct:", err);
      throw err;
    }
  }

  async updateProduct(id: number, updates: any): Promise<any> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Campos permitidos para actualizar
      const allowedFields = [
        "name",
        "description",
        "price",
        "stock",
        "category",
        "active",
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          fields.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error("No hay campos para actualizar");
      }

      // Agregar updated_at
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE products 
        SET ${fields.join(", ")} 
        WHERE id = $${paramCount} 
        RETURNING id, name, description, price, stock, category, active, 
                  created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      return result.rows[0];
    } catch (err) {
      console.error("Error en updateProduct:", err);
      throw err;
    }
  }

  async deleteProduct(id: number): Promise<any> {
    try {
      // Obtener los datos del producto antes de eliminarlo
      const selectResult = await this.pool.query(
        `
        SELECT id, name, description, price, stock, category, active, 
               created_at as "createdAt", updated_at as "updatedAt" 
        FROM products 
        WHERE id = $1
      `,
        [id]
      );

      if (selectResult.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      const product = selectResult.rows[0];

      // Eliminar el producto
      await this.pool.query("DELETE FROM products WHERE id = $1", [id]);

      return product;
    } catch (err) {
      console.error("Error en deleteProduct:", err);
      throw err;
    }
  }

  async updateProductStock(id: number, newStock: number): Promise<any> {
    try {
      const result = await this.pool.query(
        `
        UPDATE products 
        SET stock = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING id, name, description, price, stock, category, active, 
                  created_at as "createdAt", updated_at as "updatedAt"
      `,
        [newStock, id]
      );

      if (result.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      return result.rows[0];
    } catch (err) {
      console.error("Error en updateProductStock:", err);
      throw err;
    }
  }

  // Cerrar conexión a la base de datos
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log("🔒 Conexión a PostgreSQL cerrada");
    } catch (err) {
      console.error("Error al cerrar conexión:", err);
      throw err;
    }
  }

  // Método para verificar salud de la conexión
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query("SELECT 1");
      return result.rows.length > 0;
    } catch (err) {
      return false;
    }
  }
}

// Instancia singleton de la base de datos
export const db = new Database();
