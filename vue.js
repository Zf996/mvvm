// 观察者模式 （ 发布订阅）  观察者 被观察者
class Dep {
    constructor() {
        this.subs = []; //存放所有的watcher
    }
    // 订阅
    addSub(watcher) { //添加watcher
        this.subs.push(watcher)
    }
    // 发布
    notify() {
        this.subs.forEach(watcher => {
            watcher.update();
        })
    }
}
class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm; //当前实例对象里面有el和data
        this.expr = expr; //要添加监听者的变量
        this.cb = cb; //回调函数，主要用于更新方法
        // 默认先存放一个老值
        this.oldValue = this.get()
    }
    // 获取老值：只要new Watcher时就会触发此方法
    get() { // vm.$data.school vm.$data.school.name
        Dep.target = this; //在new Watcher时先把new的这个实例放在Dep的target属性上方便之后添加到监听者队列中，当下面调用获取get值时就会触发Object.defineProperty给这个变量设置的get属性，这是Dep就会把创建的这个watcher方法监听者队列上
        // 取值 把这观察者和数据关联起来
        let value = CompileUtil.getVal(this.vm, this.expr); //这一步就是把变量绑定监听者watcher时的值先获取到保存起来
        return value;
    }
    // 之后dep里面的notice方法执行时它才会执行
    update() { //更新操作 数据变化后 会调用观察者的update方法
        let newVal = CompileUtil.getVal(this.vm, this.expr);
        if (newVal != this.oldValue) {
            this.cb(newVal);
        }

    }
}
class Observer { //实现数据劫持功能
    constructor(data) {
        // console.log(data);
        this.observer(data);
    }
    observer(data) {
        // 如果是对象，循环每一项 并改变成Object.defineProperty
        if (data && typeof data == 'object') {
            // 如果是对象
            for (let key in data) {
                this.defineReactive(data, key, data[key]);
            }
        }
    }
    defineReactive(obj, key, value) {
        this.observer(value);
        let dep = new Dep() //给每一个属性 都加上一个具有发布订阅的功能
        Object.defineProperty(obj, key, {
            get() {
                // 创建watcher时， 会取到对应的watcher实例，并且把watcher放到了dep的target上面，并在new Dep的时候添加到addSub上面
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set: (newValue) => { //{school:{name:'珠峰'}} -> school={}
                if (value != newValue) {
                    // 给新值也进行监听
                    this.observer(newValue)
                    value = newValue;
                    dep.notify();
                }
            }
        })
    }
}
// 基类
class Compiler {
    constructor(el, vm) {
        // 判断el属性是不是一个元素，如果不是 那就获取
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 把当前节点中的元素获取到 放到内存中
        let fragment = this.node2fragment(this.el)
        // 把节点中的内容进行替换
        // 用数据编译模板
        this.compile(fragment)
        // 编译完成后把内容塞到页面中
        this.el.appendChild(fragment);
    }
    // 判断是不是以v-开头的元素节点
    isDirective(attrName) {
        return attrName.startsWith('v-')
    }
    // 编译元素的
    compileElement(node) {
        // 获取该元素节点的所有属性
        let attributes = node.attributes; //类数组
        // console.log(attributes);
        /**
         * NamedNodeMap {0: type, 1: v-model, type: type, v-model: v-model, length: 2}
         */
        // console.log([...attributes]);
        /**
         * [type, v-model]
           []
           []
           []
           []
           []
           [v-on:click]
           [v-html]
           []
         */
        [...attributes].forEach(attr => {
            // console.log(attr) //type="text" v-model="school.name" v-on:click="click" v-html="message"
            let {
                name,
                value: expr
            } = attr;
            if (this.isDirective(name)) { // v-model v-html v-on v-html...检查是不是以v-开头
                // console.log(node, '元素');
                let [, directive] = name.split('-'); //[v,on:click]  [v,model]...
                // 解决指令是事件的情况
                let [directiveName, eventName] = directive.split(':'); //[on,model]  [model]...
                // 需要调用不同的指令来处理
                CompileUtil[directiveName](node, expr, this.vm, eventName); //node是当前元素节点 expr是以v-开头的指令的后面的指令值如school.name。。。 vm是new Vue中的this里面有$data

            }
        })
    }
    // 编译文本的
    compileText(node) {
        // 判断当前文本节点中的内容是否包含{{}}
        let content = node.textContent;
        // console.log(content,'内容');
        if (/\{\{(.+?)\}\}/.test(content)) {
            // console.log(content)
            // 文本节点
            CompileUtil['text'](node, content, this.vm)
        }

    }
    //核心的编译方法： 此方法用来编译我们内存中dom节点
    compile(node) {
        // childNodes是获取的node下面的第一层节点（包含实际节点之间的空白节点）
        let childNodes = node.childNodes; //类数组
        [...childNodes].forEach(child => {
            if (this.isElementNode(child)) {
                // console.log(child)
                this.compileElement(child)
                // 如果是元素的话 需要把自己传进去 再去遍历子节点
                this.compile(child)
            } else {
                // console.log(child)
                this.compileText(child)
            }
        })
    }
    // 此方法是把页面中的元素全部放到文档碎片fragment中
    node2fragment(node) {
        // 创建一个文档碎片
        let fragment = document.createDocumentFragment();
        let firstChild;
        while (firstChild = node.firstChild) {
            // 只要node还有firstChild就会一直循环下去
            // appendChild具有移动性
            fragment.appendChild(firstChild);
        }
        return fragment;
    }
    // 此方法判断是不是元素节点
    isElementNode(node) {
        // 此处为什么用node.nodeType来判断是因为如果是元素节点的话他的nodeType会是1
        return node.nodeType === 1;
    }
}
CompileUtil = {
    // 取值的方法:根据表达式取到对应的数据
    getVal(vm, expr) { //vm.$data  expr: 'school.name'
        let arr = expr.split('.');
        // 如果长度为1，说明这个值就是school
        if (arr.length === 1) {
            return vm.$data[expr];
        }
        return arr.reduce((data, current) => { //[school,name]
            return data[current];
        }, vm.$data)
    },
    setVal(vm, expr, value) {
        console.log(vm)
        console.log(expr)
        console.log(value)
        expr.split('.').reduce((data, current, index, arr) => { //[school,name]
            // 当reduce遍历到name的时候就把监听事件得到的新值赋值给name(在这里是name，在其他的地方只要是数组的最后一个元素就把新值赋值给它就行)
            if (index == arr.length - 1) {
                // console.log(current)
                return data[current] = value;
            }
            // console.log(current)
            return data[current]
        }, vm.$data)
    },
    // 解析v-model这个指令
    model(node, expr, vm) { //node是节点 expr是表达式school.name vm是当前实例 vm.$data
        // 给输入框赋予value属性 node.value = xxx
        // 先获取到这个表达式在vm中的值，
        let value = this.getVal(vm, expr);
        let fn = this.updater['modelUpdater'];
        new Watcher(vm, expr, (newVal) => { //给输入框加一个观察者，如果稍后数据更新了会触发此方法
            // console.log(typeof expr)
            // 用新值赋值给输入框
            fn(node, newVal);
        });
        node.addEventListener('input', (e) => {
            let value = e.target.value; //获取用户输入的内容
            //   console.log(value)

            this.setVal(vm, expr, value);
        })
        fn(node, value);
    },
    // 解析绑定v-html这个指令的节点
    html(node, expr, vm) { //v-html="message"
        let fn = this.updater['htmlUpdater'];
        new Watcher(vm, expr, (newVal) => { //给v-html后面的值如message添加一个观察者，如果稍后数据更新了会触发此方法
            // 用新值赋值给输入框
            fn(node, newVal);
        });
        // 获取v-html指令中的值如message在vm对象中的值
        let value = this.getVal(vm, expr);
        fn(node, value);
    },
    getContentValue(vm, expr) {
        // 遍历表达式 将内容重新替换成一个完整的内容 返还回去
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            console.log(args)

            return this.getVal(vm, args[1]);
        })
    },
    text(node, expr, vm) { //expr:{{aaa}} {{bbb}}
        let fn = this.updater['textUpdater']
        let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            console.log(args)
            /*
                ["{{school.name}}", "school.name", 0, "{{school.name}}"]
                ["{{school.age}}", "school.age", 0, "{{school.age}}"]
            */
            //    给表达式每个{{}}都加上观察者
            new Watcher(vm, args[1], () => {
                fn(node, this.getContentValue(vm, expr)); //返回了一个全的字符串
            })
            return this.getVal(vm, args[1]);
        })
        fn(node, content)
    },
    on(node, expr, vm, eventName) {
        node.addEventListener(eventName, (e) => {
            vm[expr].call(vm, e);
        })
    },
    updater: {
        // 把数据插入到节点中
        modelUpdater(node, value) {
            node.value = value;
        },
        // 处理文本节点
        textUpdater(node, value) { //xss攻击
            node.textContent = value;
        },
        htmlUpdater(node, value) {
            node.innerHTML = value;
        }
    }

}
class Vue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        let computed = options.computed;
        let methods = options.methods;
        // 这个根元素 存在 编译模板
        if (this.$el) {
            // 把数据全部转换成Object.defineProperty来定义
            new Observer(this.$data);
            for (let key in computed) {
                /**
                 * 此处为什呢计算属性computed绑定的是this.$data而methods绑定的确是this呢？
                 * 那是因为计算属性在编译的时候得到{{}}中的变量getNewName后是去vm.$data中查找方法，方法就是依赖的它自己
                 *  */ 
                // 当编译的时候去vm.$data中查找计算属性变量名的时候直接给他返回computed[key].call(this)方法执行后的结果
                Object.defineProperty(this.$data, key, {
                    get: () => {
                        // console.log(this)
                        // 此处返回的是一个值
                        return computed[key].call(this);
                    }
                })
            }
            for (let key in methods) {
                Object.defineProperty(this, key, {
                    get() {
                        // console.log("调用了")
                        // 此处返回的是一个函数的名字
                        return methods[key];
                    }
                })
            }
            // 把数据获取操作 vm上的取值操作 都代理到vm.$data上去
            this.proxyVm(this.$data)
            // console.log(this.$data)
            new Compiler(this.$el, this)
        }
    }
    proxyVm(data) {
        // console.log(data)
        for (let key in data) {
            // console.log(this);

            Object.defineProperty(this, key, { //实现可以通过vm取的对应的内容
                get() {
                    // console.log(data[key])
                    return data[key]; //进行了转化操作
                },
                set(newVal) {
                    data[key] = newVal;
                }
            })
        }
    }
}