import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from store.models import Product, ProductVariant, Order, OrderItem
from tasks.models import Project, Task
from core.models import Transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial merch products, per-size variants, sample orders, fundraisers, and volunteer tasks idempotently."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("--- Seeding Store Merchandise & Volunteer Tasks (Idempotent) ---"))

        # 1. Ensure sample users exist
        user_data = [
            {"username": "officer_alex", "email": "alex.officer@skyline.edu", "name": "Alex Mercer", "role": User.ROLE_LEADER},
            {"username": "volunteer_maya", "email": "maya.volunteer@skyline.edu", "name": "Maya Lin", "role": User.ROLE_VOLUNTEER},
            {"username": "volunteer_sam", "email": "sam.volunteer@skyline.edu", "name": "Sam Rivera", "role": User.ROLE_VOLUNTEER},
            {"username": "member_jordan", "email": "jordan.member@skyline.edu", "name": "Jordan Lee", "role": User.ROLE_MEMBER},
        ]

        users = {}
        for ud in user_data:
            user, created = User.objects.get_or_create(
                username=ud["username"],
                defaults={
                    "email": ud["email"],
                    "name": ud["name"],
                    "role": ud["role"],
                    "is_active": True,
                }
            )
            if created:
                user.set_password("password123")
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  + Created user: {user.username} ({user.role})"))
            users[ud["username"]] = user

        # 2. Seed Merchandise Products & Granular Sizes
        products_data = [
            {
                "name": "Skyline Club Heavyweight Hoodie",
                "type": Product.TYPE_HOODIE,
                "price": Decimal("45.00"),
                "description": "Premium 450 GSM organic French terry fleece hoodie with embroidered Skyline Club crest on the chest. Pre-shrunk, relaxed fit with double-lined hood.",
                "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=60",
                "is_active": True,
                "variants": [
                    {"size": "S", "stock_qty": 15, "sku": "SKY-HD-S"},
                    {"size": "M", "stock_qty": 20, "sku": "SKY-HD-M"},
                    {"size": "L", "stock_qty": 8, "sku": "SKY-HD-L"},
                    {"size": "XL", "stock_qty": 3, "sku": "SKY-HD-XL"},  # Low stock alert (<=5)
                    {"size": "2XL", "stock_qty": 0, "sku": "SKY-HD-2XL"}, # Out of stock
                ],
            },
            {
                "name": "Skyline Embroidered Organic Tee",
                "type": Product.TYPE_TEE,
                "price": Decimal("22.00"),
                "description": "100% GOTS-certified ring-spun organic cotton. Features minimalist Skyline script embroidery on the left chest and subtle hem label.",
                "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=60",
                "is_active": True,
                "variants": [
                    {"size": "XS", "stock_qty": 25, "sku": "SKY-TEE-XS"},
                    {"size": "S", "stock_qty": 30, "sku": "SKY-TEE-S"},
                    {"size": "M", "stock_qty": 14, "sku": "SKY-TEE-M"},
                    {"size": "L", "stock_qty": 4, "sku": "SKY-TEE-L"},   # Low stock alert (<=5)
                    {"size": "XL", "stock_qty": 0, "sku": "SKY-TEE-XL"},  # Out of stock
                ],
            },
            {
                "name": "Skyline Vintage Corduroy Cap",
                "type": Product.TYPE_CAP,
                "price": Decimal("18.00"),
                "description": "Retro 6-panel unstructured cap in soft wide-wale corduroy. Brass buckle strap closure and custom tonal embroidery.",
                "image": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=60",
                "is_active": True,
                "variants": [
                    {"size": "One Size", "stock_qty": 22, "sku": "SKY-CAP-OS"},
                ],
            },
            {
                "name": "Skyline Die-Cut Holographic Sticker Pack",
                "type": Product.TYPE_STICKER,
                "price": Decimal("5.00"),
                "description": "Set of 5 weatherproof, UV-resistant vinyl stickers with rainbow holographic finish. Perfect for laptops, hydro flasks, and notebooks.",
                "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
                "is_active": True,
                "variants": [
                    {"size": "One Size", "stock_qty": 60, "sku": "SKY-STK-PK5"},
                ],
            },
            {
                "name": "Skyline Insulated Stainless Steel Water Bottle",
                "type": Product.TYPE_ACCESSORY,
                "price": Decimal("24.00"),
                "description": "Double-wall vacuum insulated 24oz water bottle with laser-engraved Skyline Club logo. Keeps drinks ice cold for 24h or hot for 12h.",
                "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60",
                "is_active": True,
                "variants": [
                    {"size": "One Size", "stock_qty": 2, "sku": "SKY-BOT-24"}, # Low stock alert (<=5)
                ],
            },
        ]

        created_products = {}
        for p_data in products_data:
            product, p_created = Product.objects.get_or_create(
                name=p_data["name"],
                defaults={
                    "type": p_data["type"],
                    "price": p_data["price"],
                    "description": p_data["description"],
                    "image": p_data["image"],
                    "is_active": p_data["is_active"],
                }
            )
            created_products[product.name] = product
            action_str = "Created" if p_created else "Found"
            self.stdout.write(self.style.SUCCESS(f"  + {action_str} product: {product.name} (${product.price})"))

            # Create or update variants
            for v_data in p_data["variants"]:
                variant, v_created = ProductVariant.objects.get_or_create(
                    product=product,
                    size=v_data["size"],
                    defaults={
                        "stock_qty": v_data["stock_qty"],
                        "sku": v_data["sku"],
                    }
                )
                if not v_created and variant.stock_qty != v_data["stock_qty"]:
                    variant.stock_qty = v_data["stock_qty"]
                    variant.save()
                stock_status = "OUT OF STOCK" if variant.stock_qty == 0 else f"{variant.stock_qty} in stock"
                self.stdout.write(f"    - Size {variant.size}: {stock_status} [{variant.sku}]")

        # 3. Seed Sample Orders
        sample_buyer = users.get("member_jordan")
        hoodie_prod = created_products.get("Skyline Club Heavyweight Hoodie")
        stickers_prod = created_products.get("Skyline Die-Cut Holographic Sticker Pack")

        if hoodie_prod and stickers_prod and sample_buyer:
            hoodie_variant = hoodie_prod.variants.filter(size="M").first()
            sticker_variant = stickers_prod.variants.filter(size="One Size").first()

            if hoodie_variant and sticker_variant:
                order_existing = Order.objects.filter(buyer=sample_buyer, buyer_name="Jordan Lee").first()
                if not order_existing:
                    order = Order.objects.create(
                        buyer=sample_buyer,
                        buyer_name="Jordan Lee",
                        buyer_email="jordan.member@skyline.edu",
                        status=Order.STATUS_PAID,
                        subtotal=Decimal("50.00"),
                        discount_pct=Decimal("10.00"),
                        discount_amount=Decimal("5.00"),
                        total=Decimal("45.00"),
                        payment_provider="mock",
                        payment_reference=f"MOCK-PAY-{uuid.uuid4().hex[:8]}",
                        notes="Will pick up during Friday office hours.",
                        paid_at=timezone.now(),
                    )
                    OrderItem.objects.create(
                        order=order,
                        variant=hoodie_variant,
                        qty=1,
                        unit_price=Decimal("45.00")
                    )
                    OrderItem.objects.create(
                        order=order,
                        variant=sticker_variant,
                        qty=1,
                        unit_price=Decimal("5.00")
                    )
                    # Record transaction in ledger
                    Transaction.objects.get_or_create(
                        source=f"Merch Order #{order.id}",
                        defaults={
                            "type": Transaction.TYPE_INCOME,
                            "category": Transaction.CATEGORY_MERCH,
                            "amount": Decimal("45.00"),
                            "description": "Merch store purchase for Jordan Lee (2 items via mock)"
                        }
                    )
                    self.stdout.write(self.style.SUCCESS(f"  + Created sample paid merch order #{order.id} for {sample_buyer.name} ($45.00)"))

        # 4. Seed Fundraiser Projects & Volunteer Tasks
        projects_data = [
            {
                "name": "Annual Spring Bake Sale Fundraiser",
                "goal_amount": Decimal("500.00"),
                "status": Project.STATUS_ACTIVE,
                "description": "Campus bake sale in the student union raising funds for the club hackathon team travel grant and workshop materials.",
                "created_by": users.get("officer_alex"),
                "income_amount": Decimal("225.00"),
                "tasks": [
                    {
                        "title": "Bake 3 dozen chocolate chip cookies (nut-free)",
                        "description": "Use standard recipe with dark chocolate morsels. Clearly label ingredients on sealed bakery bags.",
                        "assignee": users.get("volunteer_maya"),
                        "status": Task.STATUS_DOING,
                        "priority": Task.PRIORITY_HIGH,
                        "due_date": date.today() + timedelta(days=2),
                    },
                    {
                        "title": "Buy biodegradable plates, napkins, and tongs",
                        "description": "Pick up 100 eco-friendly plates and napkins from Costco/Target. Keep receipt for reimbursement.",
                        "assignee": users.get("volunteer_sam"),
                        "status": Task.STATUS_DONE,
                        "priority": Task.PRIORITY_MEDIUM,
                        "due_date": date.today() - timedelta(days=1),
                    },
                    {
                        "title": "Run cash box & card reader table (11am - 1pm)",
                        "description": "Manage physical cash drawer, Square POS reader, and track inventory tally sheet.",
                        "assignee": users.get("officer_alex"),
                        "status": Task.STATUS_TODO,
                        "priority": Task.PRIORITY_URGENT,
                        "due_date": date.today() + timedelta(days=3),
                    },
                    {
                        "title": "Set up folding tables & promotional vinyl banners",
                        "description": "Pick up folding tables from Student Life storage room 102 and erect table runner banners at 10:00 AM.",
                        "assignee": None,  # Open slot for volunteers to claim!
                        "status": Task.STATUS_TODO,
                        "priority": Task.PRIORITY_MEDIUM,
                        "due_date": date.today() + timedelta(days=3),
                    },
                ],
            },
            {
                "name": "Campus Charity Car Wash",
                "goal_amount": Decimal("750.00"),
                "status": Project.STATUS_ACTIVE,
                "description": "Weekend community car wash in Parking Lot B supporting local STEM youth outreach programs.",
                "created_by": users.get("officer_alex"),
                "income_amount": Decimal("350.00"),
                "tasks": [
                    {
                        "title": "Purchase high-foam car soap & microfiber wash mitts",
                        "description": "Acquire 3 gallons of biodegradable auto soap, 10 wash mitts, and 15 drying towels.",
                        "assignee": users.get("member_jordan"),
                        "status": Task.STATUS_TODO,
                        "priority": Task.PRIORITY_HIGH,
                        "due_date": date.today() + timedelta(days=5),
                    },
                    {
                        "title": "Coordinate water hookup permit with campus facilities",
                        "description": "Submit Facilities Work Request form for water spigot access behind Engineering Hall.",
                        "assignee": users.get("officer_alex"),
                        "status": Task.STATUS_DOING,
                        "priority": Task.PRIORITY_URGENT,
                        "due_date": date.today() + timedelta(days=1),
                    },
                    {
                        "title": "Design & print directional lot signage",
                        "description": "Create A-frame poster signs directing incoming traffic from North Entrance to Lot B.",
                        "assignee": None, # Open slot
                        "status": Task.STATUS_TODO,
                        "priority": Task.PRIORITY_MEDIUM,
                        "due_date": date.today() + timedelta(days=4),
                    }
                ],
            },
        ]

        for proj_data in projects_data:
            project, p_created = Project.objects.get_or_create(
                name=proj_data["name"],
                defaults={
                    "goal_amount": proj_data["goal_amount"],
                    "status": proj_data["status"],
                    "description": proj_data["description"],
                    "created_by": proj_data["created_by"],
                }
            )
            action_str = "Created" if p_created else "Found"
            self.stdout.write(self.style.SUCCESS(f"  + {action_str} fundraiser: '{project.name}' (Goal: ${project.goal_amount})"))

            # Seed ledger income for this project
            income_tx_source = f"Project #{project.id}"
            Transaction.objects.get_or_create(
                source=income_tx_source,
                defaults={
                    "type": Transaction.TYPE_INCOME,
                    "category": Transaction.CATEGORY_FUNDRAISER,
                    "amount": proj_data["income_amount"],
                    "description": f"Fundraiser revenue & cash donations for {project.name}",
                }
            )
            self.stdout.write(f"    - Linked treasury ledger income: ${proj_data['income_amount']} ({project.financial_progress_percentage}% funded)")

            # Seed Tasks
            for t_data in proj_data["tasks"]:
                task, t_created = Task.objects.get_or_create(
                    project=project,
                    title=t_data["title"],
                    defaults={
                        "description": t_data["description"],
                        "assignee": t_data["assignee"],
                        "status": t_data["status"],
                        "priority": t_data["priority"],
                        "due_date": t_data["due_date"],
                    }
                )
                assignee_label = task.assignee_display_name
                self.stdout.write(f"    - Task: [{task.status.upper()}] '{task.title}' -> {assignee_label}")

        self.stdout.write(self.style.SUCCESS("\n--- Seeding completed successfully! ---"))
