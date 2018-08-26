
/*
Simple Point class by Konrad Papała - https://github.com/kpion/geometry 

Examples:

var point1 = new Point(100,42);
var point2 = new Point([10,10]);//different input, also accepted is another Point object

console.log(point1);
point1.add(1,1);//point1 is now: 101,43
point1.add(point2);//point1 is now: 111,53
console.log(point1.x, point1.y);

//chaining is possible as well:
var point3 = point2.clone().multiply(2);

*/

class Point{
    //see this.set for possible x,y values
    constructor(x = 0,y = null){
        this.set(x,y);
    }

    /*
    possible scenarios:
    point.set(42,12);
    point.set([42,12]);
    point.set([x:42,y:12]);
    point.set(anotherPointObject);
    point.set(42);//x and y set to '42'. Useful e.g. with the this.multiply method. 
    */
    set(x = null,y = null){
        //12.3 or "12.3"
        if(typeof x === 'number' || typeof x === 'string'){
            this.x = parseFloat(x);
            if(y !== null){
                this.y = parseFloat(y);
            }else{
                this.y = x;//so, based on one value.
            }
        }else if (Array.isArray(x)) {
            let point = x; //readability
            this.x = parseFloat(point[0]);
            this.y = parseFloat(point[1]);
        }else if(typeof x === 'object'){//we (Point) or any other object having x,y properties
            let point = x; //readability
            this.x = point.x;
            this.y = point.y;
        }else{//apparently user wants an empty object, or something.
            this.x = this.y = 0;
        }
        return this; 
    }

    //see this.set for possible x,y values
    add(x, y){
       let point = new Point(x,y); //this will handle the 'x' being numbers, array, a simple object, or another Point 
       this.x += point.x;
       this.y += point.y;
       return this;
    }

    //see this.set for possible x,y values
    substract(x,y){
        let point = new Point(x,y); //this will handle the 'x' being numbers, array, a simple object, or another Point 
        this.x -= point.x;
        this.y -= point.y;
        return this;
    };

    /**
     * see this.set for possible x,y values.
     * examples: point.multiply(2,2);point.multiply(2);
    */
    multiply(x, y){
        let point = new Point(x,y); //this will handle the 'x' being numbers, array, a simple object, or another Point 
        this.x *= point.x;
        this.y *= point.y;
        return this;  
    }    

    /*
    alias for this.multiply
    */
    scale(x,y){
        return this.multiply(x,y);
    }


    /**
     * see this.set for possible x,y values.
     * examples: point.divide(2,2);point.divide(2);
    */
    divide(x, y){
        let point = new Point(x,y); //this will handle the 'x' being numbers, array, a simple object, or another Point 
        this.x /= point.x;
        this.y /= point.y;
        return this;  
    }    

    //see this.set for possible x,y values
    equals(x,y){
        let point = new Point(x,y); //this will handle the 'x' being numbers, array, a simple object, or another Point 
        return (this.x === point.x && this.y === point.y);        
    }

    clone (){
        return new Point(this);
    }

    toString(){
        return JSON.stringify(this); 
    }
}