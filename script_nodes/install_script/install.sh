echo "installing";
git clone https://github.com/yeltnar/script_net.git;
cd script_net; 
npm i;
killall node;
npm start 3000;