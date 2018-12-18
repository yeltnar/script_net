a="import start from '"
b=$1
c="';start();"
echo "$a$b$c" | ts-node;