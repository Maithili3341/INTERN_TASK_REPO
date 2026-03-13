SELECT First Name, Last Name, Subscription date
FROM customers
WHERE Customer id NOT IN (
    SELECT Customer id
    FROM customers
    WHERE YEAR(Subscription date) = 2024
);